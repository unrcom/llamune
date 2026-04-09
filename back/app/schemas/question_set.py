from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from app.schemas.question import QuestionResponse


class QuestionSetCreate(BaseModel):
    name: str
    system_prompts_id: Optional[int] = None


class QuestionSetUpdate(BaseModel):
    name: Optional[str] = None
    system_prompts_id: Optional[int] = None


class QuestionSetItemAdd(BaseModel):
    questions_id: int
    order_index: int


class QuestionSetResponse(BaseModel):
    id: int
    poc_id: int
    system_prompts_id: Optional[int]
    name: str
    status: str
    created_at: datetime
    questions: List[QuestionResponse] = []

    class Config:
        from_attributes = True


class QuestionSetSnapshotResponse(BaseModel):
    id: int
    question_sets_id: int
    system_prompt_snapshots_id: Optional[int]
    name: str
    created_at: datetime

    class Config:
        from_attributes = True
