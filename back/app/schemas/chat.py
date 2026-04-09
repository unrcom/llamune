from pydantic import BaseModel
from typing import Optional


class ChatRequest(BaseModel):
    app_name: Optional[str] = None
    poc_id: Optional[int] = None
    question: str
    system_prompts_id: Optional[int] = None
    system_prompt: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    answers_id: Optional[int] = None
