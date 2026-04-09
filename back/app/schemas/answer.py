from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class AnswerCreate(BaseModel):
    answer: str
    answer_type: str
    models_id: Optional[int] = None


class AnswerUpdate(BaseModel):
    answer: str


class AnswerResponse(BaseModel):
    id: int
    questions_id: int
    models_id: Optional[int]
    answer: str
    answer_type: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class AnswerSnapshotResponse(BaseModel):
    id: int
    answers_id: int
    questions_id: int
    answer: str
    answer_type: str
    created_at: datetime

    class Config:
        from_attributes = True
