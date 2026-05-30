from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as _Session
from pydantic import BaseModel
from typing import Annotated, Optional
from app.db.database import get_db
from app.core.auth import get_current_user
from app.models.base import QuestionSet, Project, User

DB = Annotated[_Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]

router = APIRouter(prefix="/projects/{project_id}/question_sets", tags=["question_sets"])


class QuestionSetCreate(BaseModel):
    name: str
    system_prompts_id: Optional[int] = None


class QuestionSetResponse(BaseModel):
    id: int
    project_id: int
    name: str
    status: str
    system_prompts_id: Optional[int] = None

    class Config:
        from_attributes = True


@router.get("", response_model=list[QuestionSetResponse], responses={400: {"description": "Bad Request"}, 404: {"description": "Not Found"}, 500: {"description": "Internal Server Error"}})
def get_question_sets(
    project_id: int,
    db: DB,
    _: CurrentUser,
):
    return db.query(QuestionSet).filter(
        QuestionSet.project_id == project_id
    ).order_by(QuestionSet.id).all()


@router.post("", response_model=QuestionSetResponse, status_code=201, responses={400: {"description": "Bad Request"}, 404: {"description": "Not Found"}, 500: {"description": "Internal Server Error"}})
def create_question_set(
    project_id: int,
    qs_in: QuestionSetCreate,
    db: DB,
    _: CurrentUser,
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
    qs = QuestionSet(
        project_id=project_id,
        name=qs_in.name,
        system_prompts_id=qs_in.system_prompts_id,
    )
    db.add(qs)
    db.commit()
    db.refresh(qs)
    return qs


@router.delete("/{qs_id}", status_code=204, responses={400: {"description": "Bad Request"}, 404: {"description": "Not Found"}, 500: {"description": "Internal Server Error"}})
def delete_question_set(
    project_id: int,
    qs_id: int,
    db: DB,
    _: CurrentUser,
):
    qs = db.query(QuestionSet).filter(
        QuestionSet.id == qs_id,
        QuestionSet.project_id == project_id,
    ).first()
    if not qs:
        raise HTTPException(status_code=404, detail="質問セットが見つかりません")
    db.delete(qs)
    db.commit()
