from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.db.database import get_db
from app.core.auth import get_current_user
from app.models.base import QuestionSet, Project

router = APIRouter(prefix="/projects/{project_id}/question_sets", tags=["question_sets"])


class QuestionSetCreate(BaseModel):
    name: str
    system_prompts_id: Optional[int] = None


class QuestionSetResponse(BaseModel):
    id: int
    project_id: int
    name: str
    status: str
    system_prompts_id: Optional[int]

    class Config:
        from_attributes = True


@router.get("", response_model=list[QuestionSetResponse])
def get_question_sets(
    project_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return db.query(QuestionSet).filter(
        QuestionSet.project_id == project_id
    ).order_by(QuestionSet.id).all()


@router.post("", response_model=QuestionSetResponse, status_code=201)
def create_question_set(
    project_id: int,
    qs_in: QuestionSetCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
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


@router.delete("/{qs_id}", status_code=204)
def delete_question_set(
    project_id: int,
    qs_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    qs = db.query(QuestionSet).filter(
        QuestionSet.id == qs_id,
        QuestionSet.project_id == project_id,
    ).first()
    if not qs:
        raise HTTPException(status_code=404, detail="質問セットが見つかりません")
    db.delete(qs)
    db.commit()
