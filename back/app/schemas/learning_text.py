from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class LearningTextCreate(BaseModel):
    title: str
    source_url: Optional[str] = None
    raw_text: Optional[str] = None


class LearningTextUpdate(BaseModel):
    title: Optional[str] = None
    source_url: Optional[str] = None
    raw_text: Optional[str] = None
    status: Optional[str] = None


class LearningTextResponse(BaseModel):
    id: int
    poc_id: int
    title: str
    source_url: Optional[str]
    raw_text: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class LearningTextChunkCreate(BaseModel):
    content: str
    token_count: Optional[int] = None


class LearningTextChunkResponse(BaseModel):
    id: int
    learning_texts_id: int
    chunk_index: int
    content: str
    token_count: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class LearningTextSnapshotResponse(BaseModel):
    id: int
    learning_texts_id: int
    title: str
    source_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
