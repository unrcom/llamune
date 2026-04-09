from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SystemPromptCreate(BaseModel):
    name: str
    content: str


class SystemPromptUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None
    status: Optional[str] = None


class SystemPromptResponse(BaseModel):
    id: int
    poc_id: int
    name: str
    content: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class SystemPromptSnapshotResponse(BaseModel):
    id: int
    system_prompts_id: int
    name: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True
