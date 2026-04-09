from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.base import Poc, LearningText, LearningTextChunk
from app.schemas.learning_text import (
    LearningTextCreate, LearningTextUpdate, LearningTextResponse,
    LearningTextChunkCreate, LearningTextChunkResponse,
)
from app.core.auth import get_current_user

router = APIRouter(prefix="/poc/{poc_id}/learning_texts", tags=["learning_texts"])


@router.get("", response_model=List[LearningTextResponse])
def get_learning_texts(
    poc_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    poc = db.query(Poc).filter(Poc.id == poc_id).first()
    if not poc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PoC not found")
    return db.query(LearningText).filter(
        LearningText.poc_id == poc_id,
        LearningText.status == "active",
    ).order_by(LearningText.id).all()


@router.get("/{lt_id}", response_model=LearningTextResponse)
def get_learning_text(
    poc_id: int,
    lt_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    lt = db.query(LearningText).filter(
        LearningText.id == lt_id,
        LearningText.poc_id == poc_id,
    ).first()
    if not lt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="LearningText not found")
    return lt


@router.post("", response_model=LearningTextResponse, status_code=status.HTTP_201_CREATED)
def create_learning_text(
    poc_id: int,
    lt_in: LearningTextCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    poc = db.query(Poc).filter(Poc.id == poc_id).first()
    if not poc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PoC not found")
    lt = LearningText(
        poc_id=poc_id,
        title=lt_in.title,
        source_url=lt_in.source_url,
        raw_text=lt_in.raw_text,
    )
    db.add(lt)
    db.commit()
    db.refresh(lt)
    return lt


@router.put("/{lt_id}", response_model=LearningTextResponse)
def update_learning_text(
    poc_id: int,
    lt_id: int,
    lt_in: LearningTextUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    lt = db.query(LearningText).filter(
        LearningText.id == lt_id,
        LearningText.poc_id == poc_id,
    ).first()
    if not lt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="LearningText not found")
    if lt_in.title is not None:
        lt.title = lt_in.title
    if lt_in.source_url is not None:
        lt.source_url = lt_in.source_url
    if lt_in.raw_text is not None:
        lt.raw_text = lt_in.raw_text
    if lt_in.status is not None:
        lt.status = lt_in.status
    db.commit()
    db.refresh(lt)
    return lt


@router.delete("/{lt_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_learning_text(
    poc_id: int,
    lt_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    lt = db.query(LearningText).filter(
        LearningText.id == lt_id,
        LearningText.poc_id == poc_id,
    ).first()
    if not lt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="LearningText not found")
    lt.status = "deleted"
    db.commit()


@router.get("/{lt_id}/chunks", response_model=List[LearningTextChunkResponse])
def get_chunks(
    poc_id: int,
    lt_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    lt = db.query(LearningText).filter(
        LearningText.id == lt_id,
        LearningText.poc_id == poc_id,
    ).first()
    if not lt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="LearningText not found")
    return db.query(LearningTextChunk).filter(
        LearningTextChunk.learning_texts_id == lt_id,
    ).order_by(LearningTextChunk.chunk_index).all()


@router.post("/{lt_id}/chunks", response_model=LearningTextChunkResponse, status_code=status.HTTP_201_CREATED)
def create_chunk(
    poc_id: int,
    lt_id: int,
    chunk_in: LearningTextChunkCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    lt = db.query(LearningText).filter(
        LearningText.id == lt_id,
        LearningText.poc_id == poc_id,
    ).first()
    if not lt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="LearningText not found")
    last_chunk = db.query(LearningTextChunk).filter(
        LearningTextChunk.learning_texts_id == lt_id,
    ).order_by(LearningTextChunk.chunk_index.desc()).first()
    next_index = (last_chunk.chunk_index + 1) if last_chunk else 0
    chunk = LearningTextChunk(
        learning_texts_id=lt_id,
        chunk_index=next_index,
        content=chunk_in.content,
        token_count=chunk_in.token_count,
    )
    db.add(chunk)
    db.commit()
    db.refresh(chunk)
    return chunk


@router.delete("/{lt_id}/chunks/{chunk_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chunk(
    poc_id: int,
    lt_id: int,
    chunk_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    lt = db.query(LearningText).filter(
        LearningText.id == lt_id,
        LearningText.poc_id == poc_id,
    ).first()
    if not lt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="LearningText not found")
    chunk = db.query(LearningTextChunk).filter(
        LearningTextChunk.id == chunk_id,
        LearningTextChunk.learning_texts_id == lt_id,
    ).first()
    if not chunk:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chunk not found")
    db.delete(chunk)
    db.commit()
