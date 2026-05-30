from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Annotated, Optional, List
from sqlalchemy.orm import Session as _Session
from app.db.database import get_db
from app.core.auth import get_current_user
from app.models.base import SystemPrompt, User

DB = Annotated[_Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]

router = APIRouter(prefix="/system-prompts", tags=["system_prompts"])


class SystemPromptCreate(BaseModel):
    project_id: int
    name: str
    content: str


class SystemPromptUpdate(BaseModel):
    name: str
    content: str


class SystemPromptResponse(BaseModel):
    id: int
    project_id: int
    name: str
    content: str
    created_at: str

    class Config:
        from_attributes = True


def _to_response(sp: SystemPrompt) -> SystemPromptResponse:
    return SystemPromptResponse(
        id=sp.id,
        project_id=sp.project_id,
        name=sp.name,
        content=sp.content,
        created_at=sp.created_at.isoformat(),
    )


@router.get("", response_model=List[SystemPromptResponse], responses={400: {"description": "Bad Request"}, 404: {"description": "Not Found"}, 500: {"description": "Internal Server Error"}})
def get_system_prompts(project_id: int, db: DB, _: CurrentUser):
    return [_to_response(sp) for sp in db.query(SystemPrompt).filter(SystemPrompt.project_id == project_id).all()]


@router.post("", response_model=SystemPromptResponse, status_code=201, responses={400: {"description": "Bad Request"}, 404: {"description": "Not Found"}, 500: {"description": "Internal Server Error"}})
def create_system_prompt(req: SystemPromptCreate, db: DB, _: CurrentUser):
    # プロジェクトで1件のみ
    existing = db.query(SystemPrompt).filter(SystemPrompt.project_id == req.project_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="このプロジェクトにはすでにシステムプロンプトが登録されています")
    sp = SystemPrompt(project_id=req.project_id, name=req.name, content=req.content)
    db.add(sp)
    db.commit()
    db.refresh(sp)
    return _to_response(sp)


@router.put("/{sp_id}", response_model=SystemPromptResponse, responses={400: {"description": "Bad Request"}, 404: {"description": "Not Found"}, 500: {"description": "Internal Server Error"}})
def update_system_prompt(sp_id: int, req: SystemPromptUpdate, db: DB, _: CurrentUser):
    sp = db.query(SystemPrompt).filter(SystemPrompt.id == sp_id).first()
    if not sp:
        raise HTTPException(status_code=404, detail="見つかりません")
    sp.name = req.name
    sp.content = req.content
    db.commit()
    db.refresh(sp)
    return _to_response(sp)


@router.delete("/{sp_id}", status_code=204, responses={400: {"description": "Bad Request"}, 404: {"description": "Not Found"}, 500: {"description": "Internal Server Error"}})
def delete_system_prompt(sp_id: int, db: DB, _: CurrentUser):
    sp = db.query(SystemPrompt).filter(SystemPrompt.id == sp_id).first()
    if not sp:
        raise HTTPException(status_code=404, detail="見つかりません")
    db.delete(sp)
    db.commit()
