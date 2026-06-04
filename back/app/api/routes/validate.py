import re
import os
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


class StatusResponse(BaseModel):
    loaded: bool
    model_name: Optional[str] = None
    adapter_path: Optional[str] = None


def _search_chroma(query: str, dataset_id: int, db) -> str:
    from app.models.base import Dataset
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        return NO_RESULTS
    client = _get_chroma_client()
    try:
        collection = client.get_collection(dataset.name)
        results = collection.query(query_texts=[query], n_results=3)
        docs = results.get("documents", [[]])[0]
        distances = results.get("distances", [[]])[0]
        if not docs:
            return NO_RESULTS
        for i, (doc, dist) in enumerate(zip(docs, distances)):
            logger.info(f"[RAG] query={query!r} rank={i+1} distance={dist:.4f}")
        relevant_docs = [doc for doc, dist in zip(docs, distances) if dist <= DISTANCE_THRESHOLD]
        if not relevant_docs:
            logger.info(f"[RAG] query={query!r} no relevant docs (min_distance={min(distances):.4f})")
            return NO_RESULTS
        return "\n".join(relevant_docs)
    except Exception as e:
        return f"検索エラー: {str(e)}"


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
    from app.db.database import get_db

    if not llm.is_model_loaded():
        raise HTTPException(status_code=400, detail="モデルがロードされていません")

    try:
        messages = []
        if req.system_prompt:
            messages.append({"role": "system", "content": req.system_prompt})
        messages.extend(req.messages)

        if req.rag_mode and req.dataset_id:
            user_query = next((m['content'] for m in reversed(req.messages) if m['role'] == 'user'), None)
            if user_query:
                db_gen = get_db()
                db = next(db_gen)
                search_result = _search_chroma(user_query, req.dataset_id, db)
                if search_result != NO_RESULTS:
                    rag_system = (req.system_prompt or '') + f'\n\n【参考情報】\n{search_result}'
                else:
                    rag_system = req.system_prompt or ''
                messages = []
                messages.append({"role": "system", "content": rag_system})
                messages.extend(req.messages)
                result = llm.generate_with_messages(messages, req.max_tokens)
                return {"result": result, "messages": messages, "rag_used": True, "rag_context": search_result}

        result = llm.generate_with_messages(messages, req.max_tokens)

        search_match = re.search(r'\[SEARCH\](.*?)\[/SEARCH\]', result)
        if search_match and req.dataset_id and req.rag_llm_mode:
            query = search_match.group(1)
            messages.append({"role": "assistant", "content": result})
            db_gen = get_db()
            db = next(db_gen)
            search_result = _search_chroma(query, req.dataset_id, db)
            messages.append({"role": "user", "content": f'検索結果: {search_result}'})
            result = llm.generate_with_messages(messages, req.max_tokens)

        return {"result": result, "messages": messages}

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
