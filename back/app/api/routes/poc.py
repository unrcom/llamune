from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.base import Poc, Model
from app.schemas.poc import PocCreate, PocUpdate, PocResponse
from app.core.auth import get_current_user, get_current_admin

router = APIRouter(prefix="/poc", tags=["poc"])


def _build_response(poc: Poc, db: Session) -> PocResponse:
    model = db.query(Model).filter(Model.id == poc.models_id).first() if poc.models_id else None
    return PocResponse(
        id=poc.id,
        name=poc.name,
        display_name=poc.display_name,
        models_id=poc.models_id,
        model_name=model.name if model else None,
        model_display_name=model.display_name if model else None,
        model_version=model.version if model else None,
        created_at=poc.created_at,
    )


@router.get("", response_model=List[PocResponse])
def get_pocs(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    pocs = db.query(Poc).order_by(Poc.id).all()
    return [_build_response(p, db) for p in pocs]


@router.get("/{poc_id}", response_model=PocResponse)
def get_poc(
    poc_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    poc = db.query(Poc).filter(Poc.id == poc_id).first()
    if not poc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PoC not found")
    return _build_response(poc, db)


@router.post("", response_model=PocResponse, status_code=status.HTTP_201_CREATED)
def create_poc(
    poc_in: PocCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    if poc_in.models_id:
        model = db.query(Model).filter(Model.id == poc_in.models_id).first()
        if not model:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
    poc = Poc(
        name=poc_in.name,
        display_name=poc_in.display_name,
        models_id=poc_in.models_id,
    )
    db.add(poc)
    db.commit()
    db.refresh(poc)
    return _build_response(poc, db)


@router.put("/{poc_id}", response_model=PocResponse)
def update_poc(
    poc_id: int,
    poc_in: PocUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    poc = db.query(Poc).filter(Poc.id == poc_id).first()
    if not poc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PoC not found")
    if poc_in.name is not None:
        poc.name = poc_in.name
    if poc_in.display_name is not None:
        poc.display_name = poc_in.display_name
    if poc_in.models_id is not None:
        model = db.query(Model).filter(Model.id == poc_in.models_id).first()
        if not model:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
        poc.models_id = poc_in.models_id
    db.commit()
    db.refresh(poc)
    return _build_response(poc, db)


@router.delete("/{poc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_poc(
    poc_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    poc = db.query(Poc).filter(Poc.id == poc_id).first()
    if not poc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PoC not found")
    db.delete(poc)
    db.commit()
