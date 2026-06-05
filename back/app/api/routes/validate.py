import re
import os
import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Annotated, Optional, List
from app.core.config import CHROMA_DB_DIR
from app.core.auth import get_current_user
from app.core import llm
from app.core.chroma import get_chroma_client as _get_chroma_client
from app.models.base import User

logger = logging.getLogger(__name__)

CurrentUser = Annotated[User, Depends(get_current_user)]

router = APIRouter(prefix="/validate", tags=["validate"])

DISTANCE_THRESHOLD = 1.0
NO_RESULTS = "検索結果なし"


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


def _search_chroma(query: str, dataset_id: int, db):
    """
    戻り値: (context_str, rag_result_json)
      - context_str  : LLMに渡す文字列（ヒットなしの場合は NO_RESULTS）
      - rag_result_json : ログ保存用JSON文字列（全hitと閾値・使用可否を含む）
    """
    from app.models.base import Dataset
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        return NO_RESULTS, json.dumps({"hits": [], "threshold": DISTANCE_THRESHOLD, "used": False}, ensure_ascii=False)

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

        relevant_docs = [h["text"] for h in hits if h["distance"] <= DISTANCE_THRESHOLD]
        used = len(relevant_docs) > 0

        if not used:
            logger.info(f"[RAG] query={query!r} no relevant docs (min_distance={hits[0]['distance'] if hits else 'N/A'})")

        rag_result_json = json.dumps(
            {"hits": hits, "threshold": DISTANCE_THRESHOLD, "used": used},
            ensure_ascii=False,
        )
        context_str = "\n".join(relevant_docs) if used else NO_RESULTS
        return context_str, rag_result_json

    except Exception as e:
        err_json = json.dumps({"error": str(e), "threshold": DISTANCE_THRESHOLD, "used": False}, ensure_ascii=False)
        return f"検索エラー: {str(e)}", err_json


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
def generate(req: GenerateRequest, _: CurrentUser):
    import time
    import uuid
    from app.db.database import get_db
    from app.models.base import ChatLog

    if not llm.is_model_loaded():
        raise HTTPException(status_code=400, detail="モデルがロードされていません")

    session_id = uuid.UUID(req.session_id) if req.session_id else uuid.uuid4()
    turn_cnt = sum(1 for m in req.messages if m['role'] == 'user')

    def _save_log(db, *, search_mode: str, rag_query, rag_result,
                  final_system: str, user_message: str,
                  llm_response: str, elapsed_ms: int):
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

    try:
        messages = []
        if req.system_prompt:
            messages.append({"role": "system", "content": req.system_prompt})
        messages.extend(req.messages)

        user_query = next((m['content'] for m in reversed(req.messages) if m['role'] == 'user'), "")

        # --- direct RAG モード ---
        if req.rag_mode and req.dataset_id:
            db_gen = get_db()
            db = next(db_gen)
            context_str, rag_result_json = _search_chroma(user_query, req.dataset_id, db)
            if context_str != NO_RESULTS:
                rag_system = (req.system_prompt or '') + f'\n\n【参考情報】\n{context_str}'
            else:
                rag_system = (req.system_prompt or '') + (
                    '\n\n【重要】今回はドキュメントから参考情報が見つかりませんでした。'
                    'このドメインに関する具体的な情報は提供せず、'
                    '「お調べしましたが、該当する情報が見つかりませんでした」と答えてください。'
                )
            messages = [{"role": "system", "content": rag_system}]
            messages.extend(req.messages)
            t0 = time.monotonic()
            result = llm.generate_with_messages(messages, req.max_tokens)
            elapsed_ms = int((time.monotonic() - t0) * 1000)
            _save_log(db,
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
                "log": {
                    "search_mode": "direct",
                    "rag_query": user_query,
                    "rag_result": rag_result_json,
                    "response_time_ms": elapsed_ms,
                    "model_name": llm.get_current_model_name() or "",
                    "system_prompt": rag_system,
                },
            }

        # --- 通常生成（LLM-driven RAG の第1ターンも含む）---
        t0 = time.monotonic()
        result = llm.generate_with_messages(messages, req.max_tokens)
        elapsed_ms = int((time.monotonic() - t0) * 1000)

        # --- LLM-driven RAG モード ---
        search_match = re.search(r'\[SEARCH\](.*?)\[/SEARCH\]', result)
        if search_match and req.dataset_id and req.rag_llm_mode:
            query = search_match.group(1)
            messages.append({"role": "assistant", "content": result})
            db_gen = get_db()
            db = next(db_gen)
            context_str, rag_result_json = _search_chroma(query, req.dataset_id, db)
            messages.append({"role": "user", "content": f'検索結果: {context_str}'})
            t0 = time.monotonic()
            result = llm.generate_with_messages(messages, req.max_tokens)
            elapsed_ms = int((time.monotonic() - t0) * 1000)
            _save_log(db,
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
                "log": {
                    "search_mode": "llm",
                    "rag_query": query,
                    "rag_result": rag_result_json,
                    "response_time_ms": elapsed_ms,
                    "model_name": llm.get_current_model_name() or "",
                    "system_prompt": req.system_prompt or "",
                },
            }

        # --- RAG なし ---
        db_gen = get_db()
        db = next(db_gen)
        _save_log(db,
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
            "log": {
                "search_mode": "off",
                "rag_query": None,
                "rag_result": None,
                "response_time_ms": elapsed_ms,
                "model_name": llm.get_current_model_name() or "",
                "system_prompt": req.system_prompt or "",
            },
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/system-prompt/{model_id}", responses={400: {"description": "Bad Request"}, 404: {"description": "Not Found"}, 500: {"description": "Internal Server Error"}})
def get_model_system_prompt(model_id: int, _: CurrentUser):
    from app.db.database import get_db
    from app.models.base import Model, TrainingJob, SystemPrompt
    db = next(get_db())
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
