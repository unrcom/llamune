from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.base import Poc, Question, Answer, QuestionSet, QuestionSetItem
from app.schemas.answer import AnswerUpdate, AnswerResponse
from app.core.auth import get_current_user
import psycopg2.extras

router = APIRouter(prefix="/poc/{poc_id}/question_sets/{qs_id}/answers", tags=["answers"])


@router.get("", response_model=List[AnswerResponse])
def get_answers(
    poc_id: int,
    qs_id: int,
    unanswered_only: bool = False,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    qs = db.query(QuestionSet).filter(
        QuestionSet.id == qs_id,
        QuestionSet.poc_id == poc_id,
    ).first()
    if not qs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="QuestionSet not found")

    items = db.query(QuestionSetItem).filter(
        QuestionSetItem.question_sets_id == qs_id,
    ).order_by(QuestionSetItem.order_index).all()

    result = []
    for item in items:
        human_answer = db.query(Answer).filter(
            Answer.questions_id == item.questions_id,
            Answer.answer_type == "human",
            Answer.status == "active",
        ).first()
        if unanswered_only and human_answer:
            continue
        if human_answer:
            result.append(human_answer)
    return result


@router.put("/questions/{question_id}/human-answer", response_model=AnswerResponse)
def upsert_human_answer(
    poc_id: int,
    qs_id: int,
    question_id: int,
    body: AnswerUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    qs = db.query(QuestionSet).filter(
        QuestionSet.id == qs_id,
        QuestionSet.poc_id == poc_id,
    ).first()
    if not qs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="QuestionSet not found")

    q = db.query(Question).filter(
        Question.id == question_id,
        Question.poc_id == poc_id,
    ).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    existing = db.query(Answer).filter(
        Answer.questions_id == question_id,
        Answer.answer_type == "human",
        Answer.status == "active",
    ).first()

    if existing:
        existing.answer = body.answer
        db.commit()
        db.refresh(existing)
        return existing
    else:
        answer = Answer(
            questions_id=question_id,
            answer=body.answer,
            answer_type="human",
            status="active",
        )
        db.add(answer)
        db.commit()
        db.refresh(answer)
        return answer


@router.delete("/questions/{question_id}/human-answer", status_code=status.HTTP_204_NO_CONTENT)
def delete_human_answer(
    poc_id: int,
    qs_id: int,
    question_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    answer = db.query(Answer).filter(
        Answer.questions_id == question_id,
        Answer.answer_type == "human",
        Answer.status == "active",
    ).first()
    if answer:
        answer.status = "deleted"
        db.commit()
