from contextlib import contextmanager
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.auth import get_current_user
from app.models.base import ChatSession, ChatLog, User, Project

router = APIRouter(prefix="/chat-sessions", tags=["chat-sessions"])

CurrentUser = Annotated[User, Depends(get_current_user)]

SESSION_NOT_FOUND = "セッションが見つかりません"


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


class SessionRename(BaseModel):
    name: str


@router.get(
    "",
    responses={
        400: {"description": "Bad Request"},
        404: {"description": "Not Found"},
        500: {"description": "Internal Server Error"},
    },
)
def list_sessions(
    _: CurrentUser,
    user_id: Optional[int] = None,
    project_id: Optional[int] = None,
    model_name: Optional[str] = None,
):
    with _get_db_ctx() as db:
        query = db.query(ChatSession)
        if user_id:
            query = query.filter(ChatSession.user_id == user_id)
        if project_id:
            query = query.filter(ChatSession.project_id == project_id)
        sessions = query.order_by(ChatSession.created_at.desc()).all()

        projects = {p.id: p.display_name for p in db.query(Project).all()}
        users = {u.id: u.username for u in db.query(User).all()}

        result = []
        for s in sessions:
            logs = db.query(ChatLog).filter(ChatLog.session_id == s.id).order_by(ChatLog.turn_cnt).all()
            session_model = logs[0].model_name if logs else ""

            if model_name and model_name not in session_model:
                continue

            result.append({
                "id": str(s.id),
                "name": s.name,
                "created_at": s.created_at.isoformat(),
                "turn_count": len(logs),
                "model_name": session_model,
                "user_id": s.user_id,
                "username": users.get(s.user_id, "—") if s.user_id else "—",
                "project_id": s.project_id,
                "project_name": projects.get(s.project_id, "—") if s.project_id else "—",
            })
    return result


@router.get(
    "/meta",
    responses={
        400: {"description": "Bad Request"},
        404: {"description": "Not Found"},
        500: {"description": "Internal Server Error"},
    },
)
def get_meta(_: CurrentUser):
    with _get_db_ctx() as db:
        users = db.query(User).all()
        projects = db.query(Project).all()
        logs = db.query(ChatLog.model_name).distinct().all()
        model_names = sorted({r.model_name for r in logs if r.model_name})
        return {
            "users": [{"id": u.id, "username": u.username} for u in users],
            "projects": [{"id": p.id, "display_name": p.display_name} for p in projects],
            "model_names": model_names,
        }


@router.get(
    "/{session_id}/logs",
    responses={
        400: {"description": "Bad Request"},
        404: {"description": "Not Found"},
        500: {"description": "Internal Server Error"},
    },
)
def get_session_logs(session_id: str, _: CurrentUser):
    with _get_db_ctx() as db:
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail=SESSION_NOT_FOUND)
        logs = db.query(ChatLog).filter(ChatLog.session_id == session_id).order_by(ChatLog.turn_cnt).all()
        return {
            "session": {
                "id": str(session.id),
                "name": session.name,
                "created_at": session.created_at.isoformat(),
            },
            "logs": [
                {
                    "id": str(log.id),
                    "turn_cnt": log.turn_cnt,
                    "model_name": log.model_name,
                    "user_message": log.user_message,
                    "search_mode": log.search_mode,
                    "rag_query": log.rag_query,
                    "rag_result": log.rag_result,
                    "system_prompt": log.system_prompt,
                    "llm_response": log.llm_response,
                    "response_time_ms": log.response_time_ms,
                    "created_at": log.created_at.isoformat(),
                }
                for log in logs
            ],
        }


@router.patch(
    "/{session_id}",
    responses={
        400: {"description": "Bad Request"},
        404: {"description": "Not Found"},
        500: {"description": "Internal Server Error"},
    },
)
def rename_session(session_id: str, body: SessionRename, _: CurrentUser):
    with _get_db_ctx() as db:
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail=SESSION_NOT_FOUND)
        session.name = body.name
        db.commit()
    return {"ok": True}


@router.delete(
    "/{session_id}",
    responses={
        400: {"description": "Bad Request"},
        404: {"description": "Not Found"},
        500: {"description": "Internal Server Error"},
    },
)
def delete_session(session_id: str, _: CurrentUser):
    with _get_db_ctx() as db:
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail=SESSION_NOT_FOUND)
        db.delete(session)
        db.commit()
    return {"ok": True}
