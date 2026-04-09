from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ModelCreate(BaseModel):
    name: str
    display_name: Optional[str] = None
    base_model: Optional[str] = None
    model_type: str
    adapter_path: Optional[str] = None
    parent_models_id: Optional[int] = None


class ModelResponse(BaseModel):
    id: int
    name: str
    display_name: Optional[str]
    base_model: Optional[str]
    model_type: str
    version: int
    adapter_path: Optional[str]
    parent_models_id: Optional[int]
    trained_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
