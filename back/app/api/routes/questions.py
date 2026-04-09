from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.base import Poc, Question, Answer
from app.schemas.question import QuestionCreate, QuestionUpdate, QuestionResponse
from app.schemas.answer import AnswerCreate, AnswerResponse
from app.core.auth import get_current_user

router = APIRouter(prefix="/poc/{poc_id}/questions", tags=["questions"])


@router.get("", response_model=List[QuestionResponse])
def get_questions(
    poc_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    poc = db.query(Poc).filter(Poc.id == poc_id).first()
    if not poc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PoC not found")
    return db.query(Question).filter(
        Question.poc_id == poc_id,
        Question.status == "active",
    ).order_by(Question.id).all()


@router.get("/{question_id}", response_model=QuestionResponse)
def get_question(
    poc_id: int,
    question_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(Question).filter(
        Question.id == question_id,
        Question.poc_id == poc_id,
    ).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    return q


@router.post("", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
def create_question(
    poc_id: int,
    q_in: QuestionCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    poc = db.query(Poc).filter(Poc.id == poc_id).first()
    if not poc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PoC not found")
    q = Question(
        poc_id=poc_id,
        question=q_in.question,
        training_role=q_in.training_role,
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return q


@router.put("/{question_id}", response_model=QuestionResponse)
def update_question(
    poc_id: int,
    question_id: int,
    q_in: QuestionUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(Question).filter(
        Question.id == question_id,
        Question.poc_id == poc_id,
    ).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    if q_in.question is not None:
        q.question = q_in.question
    if q_in.training_role is not None:
        q.training_role = q_in.training_role
    if q_in.status is not None:
        q.status = q_in.status
    db.commit()
    db.refresh(q)
    return q


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(
    poc_id: int,
    question_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(Question).filter(
        Question.id == question_id,
        Question.poc_id == poc_id,
    ).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    q.status = "deleted"
    db.commit()


@router.get("/{question_id}/answers", response_model=List[AnswerResponse])
def get_answers(
    poc_id: int,
    question_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(Question).filter(
        Question.id == question_id,
        Question.poc_id == poc_id,
    ).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    return db.query(Answer).filter(
        Answer.questions_id == question_id,
        Answer.status == "active",
    ).order_by(Answer.id).all()


@router.post("/{question_id}/answers", response_model=AnswerResponse, status_code=status.HTTP_201_CREATED)
def create_answer(
    poc_id: int,
    question_id: int,
    a_in: AnswerCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(Question).filter(
        Question.id == question_id,
        Question.poc_id == poc_id,
    ).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    answer = Answer(
        questions_id=question_id,
        models_id=a_in.models_id,
        answer=a_in.answer,
        answer_type=a_in.answer_type,
    )
    db.add(answer)
    db.commit()
    db.refresh(answer)
    return answer
