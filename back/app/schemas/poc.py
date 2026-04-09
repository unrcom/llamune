from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class PocCreate(BaseModel):
    name: str
    display_name: str
    models_id: Optional[int] = None


class PocUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    models_id: Optional[int] = None


class PocResponse(BaseModel):
    id: int
    name: str
    display_name: str
    models_id: Optional[int]
    model_name: Optional[str] = None
    model_display_name: Optional[str] = None
    model_version: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True
