from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.base import Poc, SystemPrompt
from app.schemas.system_prompt import SystemPromptCreate, SystemPromptUpdate, SystemPromptResponse
from app.core.auth import get_current_user

router = APIRouter(prefix="/poc/{poc_id}/system_prompts", tags=["system_prompts"])


@router.get("", response_model=List[SystemPromptResponse])
def get_system_prompts(
    poc_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    poc = db.query(Poc).filter(Poc.id == poc_id).first()
    if not poc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PoC not found")
    return db.query(SystemPrompt).filter(
        SystemPrompt.poc_id == poc_id,
        SystemPrompt.status == "active",
    ).order_by(SystemPrompt.id).all()


@router.get("/{sp_id}", response_model=SystemPromptResponse)
def get_system_prompt(
    poc_id: int,
    sp_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    sp = db.query(SystemPrompt).filter(
        SystemPrompt.id == sp_id,
        SystemPrompt.poc_id == poc_id,
    ).first()
    if not sp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SystemPrompt not found")
    return sp


@router.post("", response_model=SystemPromptResponse, status_code=status.HTTP_201_CREATED)
def create_system_prompt(
    poc_id: int,
    sp_in: SystemPromptCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    poc = db.query(Poc).filter(Poc.id == poc_id).first()
    if not poc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PoC not found")
    sp = SystemPrompt(
        poc_id=poc_id,
        name=sp_in.name,
        content=sp_in.content,
    )
    db.add(sp)
    db.commit()
    db.refresh(sp)
    return sp


@router.put("/{sp_id}", response_model=SystemPromptResponse)
def update_system_prompt(
    poc_id: int,
    sp_id: int,
    sp_in: SystemPromptUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    sp = db.query(SystemPrompt).filter(
        SystemPrompt.id == sp_id,
        SystemPrompt.poc_id == poc_id,
    ).first()
    if not sp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SystemPrompt not found")
    if sp_in.name is not None:
        sp.name = sp_in.name
    if sp_in.content is not None:
        sp.content = sp_in.content
    if sp_in.status is not None:
        sp.status = sp_in.status
    db.commit()
    db.refresh(sp)
    return sp


@router.delete("/{sp_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_system_prompt(
    poc_id: int,
    sp_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    sp = db.query(SystemPrompt).filter(
        SystemPrompt.id == sp_id,
        SystemPrompt.poc_id == poc_id,
    ).first()
    if not sp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SystemPrompt not found")
    sp.status = "deleted"
    db.commit()
