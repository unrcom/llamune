from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.base import Model
from app.schemas.model import ModelCreate, ModelResponse
from app.core.auth import get_current_user, get_current_admin

router = APIRouter(prefix="/models", tags=["models"])


@router.get("", response_model=List[ModelResponse])
def get_models(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return db.query(Model).order_by(Model.id).all()


@router.get("/{model_id}", response_model=ModelResponse)
def get_model(
    model_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    model = db.query(Model).filter(Model.id == model_id).first()
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
    return model


@router.post("", response_model=ModelResponse, status_code=status.HTTP_201_CREATED)
def create_model(
    model_in: ModelCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    if model_in.parent_models_id:
        parent = db.query(Model).filter(Model.id == model_in.parent_models_id).first()
        if not parent:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent model not found")
        version = parent.version + 1
    else:
        version = 1

    model = Model(
        name=model_in.name,
        display_name=model_in.display_name,
        base_model=model_in.base_model,
        model_type=model_in.model_type,
        adapter_path=model_in.adapter_path,
        parent_models_id=model_in.parent_models_id,
        version=version,
    )
    db.add(model)
    db.commit()
    db.refresh(model)
    return model


@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_model(
    model_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    model = db.query(Model).filter(Model.id == model_id).first()
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
    db.delete(model)
    db.commit()
