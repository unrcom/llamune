from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class QuestionCreate(BaseModel):
    question: str
    training_role: Optional[int] = None


class QuestionUpdate(BaseModel):
    question: Optional[str] = None
    training_role: Optional[int] = None
    status: Optional[str] = None


class QuestionResponse(BaseModel):
    id: int
    poc_id: int
    question: str
    training_role: Optional[int]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class QuestionSnapshotResponse(BaseModel):
    id: int
    questions_id: int
    question: str
    training_role: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True
