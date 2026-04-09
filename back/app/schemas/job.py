from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class JobCreate(BaseModel):
    poc_id: int
    models_id: int
    name: str
    training_mode: int = 2  # 1=テキスト学習 / 2=LoRAノーマル / 3=llamuneオリジナル
    question_set_snapshots_id: Optional[int] = None
    learning_text_snapshots_id: Optional[int] = None
    iters: int = 1000
    batch_size: int = 4
    learning_rate: float = 1e-5
    num_layers: int = 16
    max_seq_length: int = 2048
    loss_threshold: Optional[float] = None
    output_model_name: Optional[str] = None


class JobResponse(BaseModel):
    id: int
    poc_id: int
    models_id: Optional[int]
    question_set_snapshots_id: Optional[int]
    learning_text_snapshots_id: Optional[int]
    name: str
    status: str
    training_mode: int
    iters: int
    batch_size: int
    learning_rate: float
    num_layers: int
    max_seq_length: int
    loss_threshold: Optional[float]
    output_model_name: Optional[str]
    instance_id: Optional[str]
    error_message: Optional[str]
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
