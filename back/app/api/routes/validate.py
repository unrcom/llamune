import re
import json
import logging
import time
import uuid
from contextlib import contextmanager
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Annotated, Optional
from app.core.auth import get_current_user
from app.core import llm
from app.core.chroma import get_chroma_client as _get_chroma_client
from app.models.base import User

logger = logging.getLogger(__name__)

CurrentUser = Annotated[User, Depends(get_current_user)]

router = APIRouter(prefix="/validate", tags=["validate"])

DISTANCE_THRESHOLD = 1.0  # fallback default
NO_RESULTS = "検索結果なし"
NO_RESULTS_PROMPT = (
    '\n\n【重要】今回はドキュメントから参考情報が見つかりませんでした。'
    'このドメインに関する具体的な情報は提供せず、'
    '「お調べしましたが、該当する情報が見つかりませんでした」と答えてください。'
)


class LoadRequest(BaseModel):
    model_name: str
    adapter_path: Optional[str] = None


class GenerateRequest(BaseModel):
    messages: list
    system_prompt: Optional[str] = None
    max_tokens: int = 512
    dataset_id: Optional[int] = None
    rag_mode: bool = False
    rag_llm_mode: bool = False
    session_id: Optional[str] = None


class StatusResponse(BaseModel):
    loaded: bool
    model_name: Optional[str] = None
    adapter_path: Optional[str] = None


@contextmanager
def _get_db_ctx():
    from app.db.database import get_db
    gen = get_db()
    db = next(gen)
    try:
        yield db
    finally:
        try:
            next(gen)
        except StopIteration:
            pass


def _get_project_id_from_dataset(dataset_id: int) -> Optional[int]:
    from app.models.base import Dataset
    with _get_db_ctx() as db:
        dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        return dataset.project_id if dataset else None


def _search_chroma(query: str, dataset_id: int, db, threshold: float = DISTANCE_THRESHOLD):
    """
    戻り値: (context_str, rag_result_json)
      - context_str     : LLMに渡す文字列（ヒットなしの場合は NO_RESULTS）
      - rag_result_json : ログ保存用JSON文字列（全hitと閾値・使用可否を含む）
    """
    from app.models.base import Dataset
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        empty = json.dumps({"hits": [], "threshold": threshold, "used": False}, ensure_ascii=False)
        return NO_RESULTS, empty

    client = _get_chroma_client()
    try:
        collection = client.get_collection(dataset.name)
        results = collection.query(query_texts=[query], n_results=3)
        docs = results.get("documents", [[]])[0]
        distances = results.get("distances", [[]])[0]

        hits = [
            {"rank": i + 1, "distance": round(dist, 4), "text": doc}
            for i, (doc, dist) in enumerate(zip(docs, distances))
        ]
        for h in hits:
            logger.info(f"[RAG] query={query!r} rank={h['rank']} distance={h['distance']}")

        relevant_docs = [h["text"] for h in hits if h["distance"] <= threshold]
        used = len(relevant_docs) > 0

        if not used:
            min_dist = hits[0]["distance"] if hits else "N/A"
            logger.info(f"[RAG] query={query!r} no relevant docs (min_distance={min_dist})")

        rag_result_json = json.dumps(
            {"hits": hits, "threshold": threshold, "used": used},
            ensure_ascii=False,
        )
        context_str = "\n".join(relevant_docs) if used else NO_RESULTS
        return context_str, rag_result_json

    except Exception as e:
        err_json = json.dumps({"error": str(e), "threshold": threshold, "used": False}, ensure_ascii=False)
        return f"検索エラー: {str(e)}", err_json


def _build_log(*, search_mode: str, rag_query, rag_result, elapsed_ms: int, final_system: str) -> dict:
    return {
        "search_mode": search_mode,
        "rag_query": rag_query,
        "rag_result": rag_result,
        "response_time_ms": elapsed_ms,
        "model_name": llm.get_current_model_name() or "",
        "system_prompt": final_system,
    }


def _save_chat_log(db, *, session_id, turn_cnt: int, search_mode: str,
                   rag_query, rag_result, final_system: str,
                   user_message: str, llm_response: str, elapsed_ms: int):
    from app.models.base import ChatLog
    log = ChatLog(
        session_id       = session_id,
        turn_cnt         = turn_cnt,
        model_name       = llm.get_current_model_name() or "",
        user_message     = user_message,
        search_mode      = search_mode,
        rag_query        = rag_query,
        rag_result       = rag_result,
        system_prompt    = final_system,
        llm_response     = llm_response,
        response_time_ms = elapsed_ms,
    )
    db.add(log)
    db.commit()


def _handle_direct_rag(req: GenerateRequest, session_id, turn_cnt: int, user_query: str) -> dict:
    with _get_db_ctx() as db:
        from app.models.base import Dataset, Project
        dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id).first()
        project = db.query(Project).filter(Project.id == dataset.project_id).first() if dataset else None
        threshold = project.rag_threshold if project else DISTANCE_THRESHOLD
        context_str, rag_result_json = _search_chroma(user_query, req.dataset_id, db, threshold)

        if context_str != NO_RESULTS:
            rag_system = (req.system_prompt or '') + f'\n\n【参考情報】\n{context_str}'
        else:
            rag_system = (req.system_prompt or '') + NO_RESULTS_PROMPT

        messages = [{"role": "system", "content": rag_system}]
        messages.extend(req.messages)

        t0 = time.monotonic()
        result = llm.generate_with_messages(messages, req.max_tokens)
        elapsed_ms = int((time.monotonic() - t0) * 1000)

        _save_chat_log(db,
            session_id   = session_id,
            turn_cnt     = turn_cnt,
            search_mode  = "direct",
            rag_query    = user_query,
            rag_result   = rag_result_json,
            final_system = rag_system,
            user_message = user_query,
            llm_response = result,
            elapsed_ms   = elapsed_ms,
        )
    return {
        "result": result,
        "messages": messages,
        "rag_used": context_str != NO_RESULTS,
        "rag_context": context_str if context_str != NO_RESULTS else None,
        "session_id": str(session_id),
        "log": _build_log(search_mode="direct", rag_query=user_query,
                          rag_result=rag_result_json, elapsed_ms=elapsed_ms,
                          final_system=rag_system),
    }


def _handle_llm_rag(req: GenerateRequest, session_id, turn_cnt: int,
                    user_query: str, messages: list, first_result: str) -> dict | None:
    search_match = re.search(r'\[SEARCH\](.*?)\[/SEARCH\]', first_result)
    if not search_match:
        return None
    query = search_match.group(1)
    messages.append({"role": "assistant", "content": first_result})

    with _get_db_ctx() as db:
        from app.models.base import Dataset, Project
        dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id).first()
        project = db.query(Project).filter(Project.id == dataset.project_id).first() if dataset else None
        threshold = project.rag_threshold if project else DISTANCE_THRESHOLD
        context_str, rag_result_json = _search_chroma(query, req.dataset_id, db, threshold)
        messages.append({"role": "user", "content": f'検索結果: {context_str}'})

        t0 = time.monotonic()
        result = llm.generate_with_messages(messages, req.max_tokens)
        elapsed_ms = int((time.monotonic() - t0) * 1000)

        _save_chat_log(db,
            session_id   = session_id,
            turn_cnt     = turn_cnt,
            search_mode  = "llm",
            rag_query    = query,
            rag_result   = rag_result_json,
            final_system = req.system_prompt or "",
            user_message = user_query,
            llm_response = result,
            elapsed_ms   = elapsed_ms,
        )
    return {
        "result": result,
        "messages": messages,
        "session_id": str(session_id),
        "log": _build_log(search_mode="llm", rag_query=query,
                          rag_result=rag_result_json, elapsed_ms=elapsed_ms,
                          final_system=req.system_prompt or ""),
    }


def _handle_no_rag(req: GenerateRequest, session_id, turn_cnt: int,
                   user_query: str, messages: list, result: str, elapsed_ms: int) -> dict:
    with _get_db_ctx() as db:
        _save_chat_log(db,
            session_id   = session_id,
            turn_cnt     = turn_cnt,
            search_mode  = "off",
            rag_query    = None,
            rag_result   = None,
            final_system = req.system_prompt or "",
            user_message = user_query,
            llm_response = result,
            elapsed_ms   = elapsed_ms,
        )
    return {
        "result": result,
        "messages": messages,
        "session_id": str(session_id),
        "log": _build_log(search_mode="off", rag_query=None, rag_result=None,
                          elapsed_ms=elapsed_ms, final_system=req.system_prompt or ""),
    }


@router.get("/status", response_model=StatusResponse, responses={400: {"description": "Bad Request"}, 404: {"description": "Not Found"}, 500: {"description": "Internal Server Error"}})
def get_status(_: CurrentUser):
    return StatusResponse(
        loaded=llm.is_model_loaded(),
        model_name=llm.get_current_model_name(),
        adapter_path=llm.get_current_adapter_path(),
    )


@router.post("/load", responses={400: {"description": "Bad Request"}, 404: {"description": "Not Found"}, 500: {"description": "Internal Server Error"}})
def load_model(req: LoadRequest, _: CurrentUser):
    try:
        llm.load_model(req.model_name, req.adapter_path)
        return {"ok": True, "model_name": req.model_name, "adapter_path": req.adapter_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate", responses={400: {"description": "Bad Request"}, 404: {"description": "Not Found"}, 500: {"description": "Internal Server Error"}})
def generate(req: GenerateRequest, current_user: CurrentUser):
    if not llm.is_model_loaded():
        raise HTTPException(status_code=400, detail="モデルがロードされていません")

    is_new_session = not req.session_id
    session_id = uuid.UUID(req.session_id) if req.session_id else uuid.uuid4()
    turn_cnt = sum(1 for m in req.messages if m['role'] == 'user')

    if is_new_session:
        from app.models.base import ChatSession
        session_name = time.strftime('%Y-%m-%d %H:%M', time.gmtime())
        project_id = _get_project_id_from_dataset(req.dataset_id) if req.dataset_id else None
        with _get_db_ctx() as db:
            chat_session = ChatSession(
                id         = session_id,
                name       = session_name,
                user_id    = current_user.id,
                project_id = project_id,
            )
            db.add(chat_session)
            db.commit()

    user_query = next((m['content'] for m in reversed(req.messages) if m['role'] == 'user'), "")

    try:
        messages = []
        if req.system_prompt:
            messages.append({"role": "system", "content": req.system_prompt})
        messages.extend(req.messages)

        if req.rag_mode and req.dataset_id:
            return _handle_direct_rag(req, session_id, turn_cnt, user_query)

        t0 = time.monotonic()
        result = llm.generate_with_messages(messages, req.max_tokens)
        elapsed_ms = int((time.monotonic() - t0) * 1000)

        if req.rag_llm_mode and req.dataset_id:
            llm_rag_result = _handle_llm_rag(req, session_id, turn_cnt,
                                              user_query, messages, result)
            if llm_rag_result:
                return llm_rag_result

        return _handle_no_rag(req, session_id, turn_cnt, user_query, messages, result, elapsed_ms)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/system-prompt/{model_id}", responses={400: {"description": "Bad Request"}, 404: {"description": "Not Found"}, 500: {"description": "Internal Server Error"}})
def get_model_system_prompt(model_id: int, _: CurrentUser):
    from app.models.base import Model, TrainingJob, SystemPrompt
    with _get_db_ctx() as db:
        model = db.query(Model).filter(Model.id == model_id).first()
        if not model or model.model_type != "fine-tuned":
            return {"system_prompt": None}
        job = db.query(TrainingJob).filter(TrainingJob.models_id == model.parent_models_id).first()
        if not job:
            return {"system_prompt": None}
        sp = db.query(SystemPrompt).filter(SystemPrompt.project_id == job.project_id).first()
        if not sp:
            return {"system_prompt": None}
        return {"system_prompt": sp.content}

