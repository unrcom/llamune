from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.base import Poc, Question, QuestionSet, QuestionSetItem, SystemPrompt, QuestionSetSnapshot, QuestionSetItemSnapshot, QuestionSnapshot, SystemPromptSnapshot, Answer, AnswerSnapshot
from app.schemas.question_set import (
    QuestionSetCreate, QuestionSetUpdate, QuestionSetItemAdd, QuestionSetResponse, QuestionSetSnapshotResponse
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


@router.post("/{qs_id}/snapshots", response_model=QuestionSetSnapshotResponse, status_code=status.HTTP_201_CREATED)
def create_snapshot(
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

    items = db.query(QuestionSetItem).filter(
        QuestionSetItem.question_sets_id == qs_id
    ).all()
    if not items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="質問セットに質問がありません")

    # system_prompt スナップショット
    sp_snapshot_id = None
    if qs.system_prompts_id:
        sp = db.query(SystemPrompt).filter(SystemPrompt.id == qs.system_prompts_id).first()
        if sp:
            sp_snapshot = SystemPromptSnapshot(
                system_prompts_id=sp.id,
                name=sp.name,
                content=sp.content,
            )
            db.add(sp_snapshot)
            db.flush()
            sp_snapshot_id = sp_snapshot.id

    # question_set スナップショット
    qs_snapshot = QuestionSetSnapshot(
        question_sets_id=qs.id,
        system_prompt_snapshots_id=sp_snapshot_id,
        name=qs.name,
    )
    db.add(qs_snapshot)
    db.flush()

    # items スナップショット
    for item in items:
        q = db.query(Question).filter(Question.id == item.questions_id).first()
        if not q:
            continue
        q_snapshot = QuestionSnapshot(
            questions_id=q.id,
            question=q.question,
            training_role=q.training_role,
        )
        db.add(q_snapshot)
        db.flush()

        qsi_snapshot = QuestionSetItemSnapshot(
            question_set_snapshots_id=qs_snapshot.id,
            question_snapshots_id=q_snapshot.id,
            order_index=item.order_index,
        )
        db.add(qsi_snapshot)

        # human 回答スナップショット
        human_answer = db.query(Answer).filter(
            Answer.questions_id == q.id,
            Answer.answer_type == "human",
            Answer.status == "active",
        ).first()
        if human_answer:
            a_snapshot = AnswerSnapshot(
                answers_id=human_answer.id,
                questions_id=q.id,
                answer=human_answer.answer,
                answer_type=human_answer.answer_type,
            )
            db.add(a_snapshot)

    # question_set を active にロック
    qs.status = "active"

    db.commit()
    db.refresh(qs_snapshot)
    return qs_snapshot


@router.get("/{qs_id}/snapshots", response_model=list[QuestionSetSnapshotResponse])
def list_snapshots(
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
    snapshots = db.query(QuestionSetSnapshot).filter(
        QuestionSetSnapshot.question_sets_id == qs_id
    ).order_by(QuestionSetSnapshot.id.desc()).all()
    return snapshots
