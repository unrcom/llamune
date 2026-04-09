from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.base import Poc, Question, QuestionSet, QuestionSetItem, SystemPrompt
from app.schemas.question_set import (
    QuestionSetCreate, QuestionSetUpdate, QuestionSetItemAdd, QuestionSetResponse
)
from app.schemas.question import QuestionResponse
from app.core.auth import get_current_user

router = APIRouter(prefix="/poc/{poc_id}/question_sets", tags=["question_sets"])


def _build_response(qs: QuestionSet, db: Session) -> QuestionSetResponse:
    items = db.query(QuestionSetItem).filter(
        QuestionSetItem.question_sets_id == qs.id
    ).order_by(QuestionSetItem.order_index).all()
    questions = []
    for item in items:
        q = db.query(Question).filter(Question.id == item.questions_id).first()
        if q:
            questions.append(QuestionResponse.model_validate(q))
    return QuestionSetResponse(
        id=qs.id,
        poc_id=qs.poc_id,
        system_prompts_id=qs.system_prompts_id,
        name=qs.name,
        status=qs.status,
        created_at=qs.created_at,
        questions=questions,
    )


def _check_editable(qs: QuestionSet):
    if qs.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"この質問セットは編集できません（status={qs.status}）。新バージョンを作成してください。",
        )


@router.get("", response_model=List[QuestionSetResponse])
def get_question_sets(
    poc_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    poc = db.query(Poc).filter(Poc.id == poc_id).first()
    if not poc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PoC not found")
    qsets = db.query(QuestionSet).filter(
        QuestionSet.poc_id == poc_id,
        QuestionSet.status.in_(["draft", "active"]),
    ).order_by(QuestionSet.id).all()
    return [_build_response(qs, db) for qs in qsets]


@router.get("/{qs_id}", response_model=QuestionSetResponse)
def get_question_set(
    poc_id: int,
    qs_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    qs = db.query(QuestionSet).filter(
        QuestionSet.id == qs_id,
        QuestionSet.poc_id == poc_id,
    ).first()
    if not qs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="QuestionSet not found")
    return _build_response(qs, db)


@router.post("", response_model=QuestionSetResponse, status_code=status.HTTP_201_CREATED)
def create_question_set(
    poc_id: int,
    qs_in: QuestionSetCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    poc = db.query(Poc).filter(Poc.id == poc_id).first()
    if not poc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PoC not found")
    if qs_in.system_prompts_id:
        sp = db.query(SystemPrompt).filter(SystemPrompt.id == qs_in.system_prompts_id).first()
        if not sp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SystemPrompt not found")
    qs = QuestionSet(
        poc_id=poc_id,
        system_prompts_id=qs_in.system_prompts_id,
        name=qs_in.name,
        status="draft",
    )
    db.add(qs)
    db.commit()
    db.refresh(qs)
    return _build_response(qs, db)


@router.put("/{qs_id}", response_model=QuestionSetResponse)
def update_question_set(
    poc_id: int,
    qs_id: int,
    qs_in: QuestionSetUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    qs = db.query(QuestionSet).filter(
        QuestionSet.id == qs_id,
        QuestionSet.poc_id == poc_id,
    ).first()
    if not qs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="QuestionSet not found")
    _check_editable(qs)
    if qs_in.name is not None:
        qs.name = qs_in.name
    if qs_in.system_prompts_id is not None:
        qs.system_prompts_id = qs_in.system_prompts_id
    db.commit()
    db.refresh(qs)
    return _build_response(qs, db)


@router.delete("/{qs_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question_set(
    poc_id: int,
    qs_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    qs = db.query(QuestionSet).filter(
        QuestionSet.id == qs_id,
        QuestionSet.poc_id == poc_id,
    ).first()
    if not qs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="QuestionSet not found")
    _check_editable(qs)
    qs.status = "deleted"
    db.commit()


@router.post("/{qs_id}/items", response_model=QuestionSetResponse, status_code=status.HTTP_201_CREATED)
def add_item(
    poc_id: int,
    qs_id: int,
    item_in: QuestionSetItemAdd,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    qs = db.query(QuestionSet).filter(
        QuestionSet.id == qs_id,
        QuestionSet.poc_id == poc_id,
    ).first()
    if not qs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="QuestionSet not found")
    _check_editable(qs)
    q = db.query(Question).filter(
        Question.id == item_in.questions_id,
        Question.poc_id == poc_id,
    ).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    existing = db.query(QuestionSetItem).filter(
        QuestionSetItem.question_sets_id == qs_id,
        QuestionSetItem.questions_id == item_in.questions_id,
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Question already in set")
    item = QuestionSetItem(
        question_sets_id=qs_id,
        questions_id=item_in.questions_id,
        order_index=item_in.order_index,
    )
    db.add(item)
    db.commit()
    return _build_response(qs, db)


@router.delete("/{qs_id}/items/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_item(
    poc_id: int,
    qs_id: int,
    question_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    qs = db.query(QuestionSet).filter(
        QuestionSet.id == qs_id,
        QuestionSet.poc_id == poc_id,
    ).first()
    if not qs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="QuestionSet not found")
    _check_editable(qs)
    item = db.query(QuestionSetItem).filter(
        QuestionSetItem.question_sets_id == qs_id,
        QuestionSetItem.questions_id == question_id,
    ).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    db.delete(item)
    db.commit()


@router.post("/{qs_id}/new-version", response_model=QuestionSetResponse, status_code=status.HTTP_201_CREATED)
def create_new_version(
    poc_id: int,
    qs_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    src = db.query(QuestionSet).filter(
        QuestionSet.id == qs_id,
        QuestionSet.poc_id == poc_id,
    ).first()
    if not src:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="QuestionSet not found")
    if src.status == "draft":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="まだ編集可能です。新バージョンの作成はロック後に行えます。",
        )
    new_qs = QuestionSet(
        poc_id=poc_id,
        system_prompts_id=src.system_prompts_id,
        name=src.name,
        status="draft",
    )
    db.add(new_qs)
    db.flush()

    src_items = db.query(QuestionSetItem).filter(
        QuestionSetItem.question_sets_id == qs_id
    ).order_by(QuestionSetItem.order_index).all()

    for item in src_items:
        new_item = QuestionSetItem(
            question_sets_id=new_qs.id,
            questions_id=item.questions_id,
            order_index=item.order_index,
        )
        db.add(new_item)

    db.commit()
    db.refresh(new_qs)
    return _build_response(new_qs, db)
