from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class ExecutionResultResponse(BaseModel):
    id: int
    question_set_executions_id: int
    question_snapshots_id: int
    answers_id: Optional[int]
    status: int
    error_message: Optional[str]
    question_text: Optional[str] = None
    answer_text: Optional[str] = None

    class Config:
        from_attributes = True


class ExecutionResponse(BaseModel):
    id: int
    question_set_snapshots_id: int
    models_id: int
    status: int
    executed_at: datetime
    finished_at: Optional[datetime]
    results: List[ExecutionResultResponse] = []

    class Config:
        from_attributes = True
