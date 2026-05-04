import os
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.db.database import get_db
from app.core.auth import get_current_user
from app.models.base import Model

router = APIRouter(prefix="/models", tags=["models"])

HF_CACHE_DIR = Path.home() / ".cache" / "huggingface" / "hub"


class ModelCreate(BaseModel):
    name: str
    display_name: str
    model_type: str = "base"
    adapter_path: Optional[str] = None
    parent_models_id: Optional[int] = None


class ModelResponse(BaseModel):
    id: int
    name: str
    display_name: str
    model_type: str
    adapter_path: Optional[str]
    parent_models_id: Optional[int]

    class Config:
        from_attributes = True


class LocalModelResponse(BaseModel):
    name: str        # mlx-community/Qwen2.5-14B-Instruct-4bit
    display_name: str  # Qwen2.5-14B-Instruct-4bit
    registered: bool  # DBに登録済みかどうか


@router.get("/local-adapters")
def get_local_adapters(
    _=Depends(get_current_user),
):
    """~/llmn_adapters/ 以下のアダプター一覧を返す"""
    adapters_dir = Path.home() / "llmn_adapters"
    if not adapters_dir.exists():
        return []

    adapters = []
    for entry in sorted(adapters_dir.iterdir()):
        if not entry.is_dir():
            continue
        # adapters.safetensors が存在するか確認
        if (entry / "adapters.safetensors").exists():
            adapters.append({
                "path": str(entry),
                "name": entry.name,
            })

    return adapters


@router.get("/local", response_model=list[LocalModelResponse])
def get_local_models(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """~/.cache/huggingface/hub/ にあるモデルを一覧返す"""
    if not HF_CACHE_DIR.exists():
        return []

    # 登録済みモデル名一覧
    registered_names = {m.name for m in db.query(Model).all()}

    local_models = []
    for entry in sorted(HF_CACHE_DIR.iterdir()):
        if not entry.is_dir():
            continue
        dirname = entry.name
        if not dirname.startswith("models--"):
            continue
        # models--mlx-community--Qwen2.5-14B-Instruct-4bit
        # → mlx-community/Qwen2.5-14B-Instruct-4bit
        parts = dirname[len("models--"):].split("--")
        if len(parts) < 2:
            continue
        name = "/".join(parts)
        display_name = "--".join(parts[1:])
        local_models.append(LocalModelResponse(
            name=name,
            display_name=display_name,
            registered=name in registered_names,
        ))

    return local_models


@router.get("", response_model=list[ModelResponse])
def get_models(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return db.query(Model).order_by(Model.id).all()


@router.post("", response_model=ModelResponse, status_code=201)
def create_model(
    model_in: ModelCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    if model_in.parent_models_id:
        parent = db.query(Model).filter(Model.id == model_in.parent_models_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="親モデルが見つかりません")

    model = Model(
        name=model_in.name,
        display_name=model_in.display_name,
        model_type=model_in.model_type,
        adapter_path=model_in.adapter_path,
        parent_models_id=model_in.parent_models_id,
    )
    db.add(model)
    db.commit()
    db.refresh(model)
    return model


class ModelUpdate(BaseModel):
    display_name: str
    adapter_path: Optional[str] = None


@router.put("/{model_id}", response_model=ModelResponse)
def update_model(
    model_id: int,
    model_in: ModelUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    model = db.query(Model).filter(Model.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="モデルが見つかりません")
    model.display_name = model_in.display_name
    if model.model_type == "fine-tuned":
        model.adapter_path = model_in.adapter_path
    db.commit()
    db.refresh(model)
    return model


@router.delete("/{model_id}", status_code=204)
def delete_model(
    model_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    model = db.query(Model).filter(Model.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="モデルが見つかりません")
    db.delete(model)
    db.commit()
