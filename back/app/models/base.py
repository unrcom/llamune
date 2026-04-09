from sqlalchemy import (
    Column, Integer, String, Text, SmallInteger,
    TIMESTAMP, Boolean, Double, ForeignKey
)
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()
SCHEMA = "llamune"


class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True)
    username = Column(String(50), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    is_admin = Column(Boolean, nullable=False, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True)
    users_id = Column(Integer, ForeignKey(f"{SCHEMA}.users.id"), nullable=False)
    token = Column(String(255), nullable=False, unique=True)
    expires_at = Column(TIMESTAMP, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class Model(Base):
    __tablename__ = "models"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    display_name = Column(String(255), nullable=True)
    base_model = Column(String(100), nullable=True)
    model_type = Column(String(20), nullable=False)
    version = Column(Integer, nullable=False, default=1)
    adapter_path = Column(String(500), nullable=True)
    parent_models_id = Column(Integer, ForeignKey(f"{SCHEMA}.models.id"), nullable=True)
    trained_at = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class Poc(Base):
    __tablename__ = "poc"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    display_name = Column(String(100), nullable=False)
    models_id = Column(Integer, ForeignKey(f"{SCHEMA}.models.id"), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class SystemPrompt(Base):
    __tablename__ = "system_prompts"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True)
    poc_id = Column(Integer, ForeignKey(f"{SCHEMA}.poc.id"), nullable=False)
    name = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="active")
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class SystemPromptSnapshot(Base):
    __tablename__ = "system_prompt_snapshots"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True)
    system_prompts_id = Column(Integer, ForeignKey(f"{SCHEMA}.system_prompts.id"), nullable=False)
    name = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class Question(Base):
    __tablename__ = "questions"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True)
    poc_id = Column(Integer, ForeignKey(f"{SCHEMA}.poc.id"), nullable=False)
    question = Column(Text, nullable=False)
    training_role = Column(Integer, nullable=True)
    status = Column(String(20), nullable=False, default="active")
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class QuestionSnapshot(Base):
    __tablename__ = "question_snapshots"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True)
    questions_id = Column(Integer, ForeignKey(f"{SCHEMA}.questions.id"), nullable=False)
    question = Column(Text, nullable=False)
    training_role = Column(Integer, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class Answer(Base):
    __tablename__ = "answers"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True)
    questions_id = Column(Integer, ForeignKey(f"{SCHEMA}.questions.id"), nullable=False)
    models_id = Column(Integer, ForeignKey(f"{SCHEMA}.models.id"), nullable=True)
    answer = Column(Text, nullable=False)
    answer_type = Column(String(20), nullable=False)
    status = Column(String(20), nullable=False, default="active")
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class AnswerSnapshot(Base):
    __tablename__ = "answer_snapshots"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True)
    answers_id = Column(Integer, ForeignKey(f"{SCHEMA}.answers.id"), nullable=False)
    questions_id = Column(Integer, ForeignKey(f"{SCHEMA}.questions.id"), nullable=False)
    answer = Column(Text, nullable=False)
    answer_type = Column(String(20), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class QuestionSet(Base):
    __tablename__ = "question_sets"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True)
    poc_id = Column(Integer, ForeignKey(f"{SCHEMA}.poc.id"), nullable=False)
    system_prompts_id = Column(Integer, ForeignKey(f"{SCHEMA}.system_prompts.id"), nullable=True)
    name = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False, default="draft")
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class QuestionSetItem(Base):
    __tablename__ = "question_set_items"
    __table_args__ = {"schema": SCHEMA}

    question_sets_id = Column(Integer, ForeignKey(f"{SCHEMA}.question_sets.id"), primary_key=True)
    questions_id = Column(Integer, ForeignKey(f"{SCHEMA}.questions.id"), primary_key=True)
    order_index = Column(Integer, nullable=False)


class QuestionSetSnapshot(Base):
    __tablename__ = "question_set_snapshots"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True)
    question_sets_id = Column(Integer, ForeignKey(f"{SCHEMA}.question_sets.id"), nullable=False)
    system_prompt_snapshots_id = Column(Integer, ForeignKey(f"{SCHEMA}.system_prompt_snapshots.id"), nullable=True)
    name = Column(String(100), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class QuestionSetItemSnapshot(Base):
    __tablename__ = "question_set_item_snapshots"
    __table_args__ = {"schema": SCHEMA}

    question_set_snapshots_id = Column(Integer, ForeignKey(f"{SCHEMA}.question_set_snapshots.id"), primary_key=True)
    question_snapshots_id = Column(Integer, ForeignKey(f"{SCHEMA}.question_snapshots.id"), primary_key=True)
    order_index = Column(Integer, nullable=False)


class QuestionSetExecution(Base):
    __tablename__ = "question_set_executions"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True)
    question_set_snapshots_id = Column(Integer, ForeignKey(f"{SCHEMA}.question_set_snapshots.id"), nullable=False)
    models_id = Column(Integer, ForeignKey(f"{SCHEMA}.models.id"), nullable=False)
    status = Column(SmallInteger, nullable=False, default=1)
    executed_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    finished_at = Column(TIMESTAMP, nullable=True)


class QuestionSetExecutionResult(Base):
    __tablename__ = "question_set_execution_results"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True)
    question_set_executions_id = Column(Integer, ForeignKey(f"{SCHEMA}.question_set_executions.id"), nullable=False)
    question_snapshots_id = Column(Integer, ForeignKey(f"{SCHEMA}.question_snapshots.id"), nullable=False)
    answers_id = Column(Integer, ForeignKey(f"{SCHEMA}.answers.id"), nullable=True)
    status = Column(SmallInteger, nullable=False, default=1)
    error_message = Column(Text, nullable=True)


class LearningText(Base):
    __tablename__ = "learning_texts"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True)
    poc_id = Column(Integer, ForeignKey(f"{SCHEMA}.poc.id"), nullable=False)
    title = Column(String(255), nullable=False)
    source_url = Column(String(500), nullable=True)
    raw_text = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="active")
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class LearningTextChunk(Base):
    __tablename__ = "learning_text_chunks"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True)
    learning_texts_id = Column(Integer, ForeignKey(f"{SCHEMA}.learning_texts.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    token_count = Column(Integer, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class LearningTextSnapshot(Base):
    __tablename__ = "learning_text_snapshots"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True)
    learning_texts_id = Column(Integer, ForeignKey(f"{SCHEMA}.learning_texts.id"), nullable=False)
    title = Column(String(255), nullable=False)
    source_url = Column(String(500), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class LearningTextChunkSnapshot(Base):
    __tablename__ = "learning_text_chunk_snapshots"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True)
    learning_text_snapshots_id = Column(Integer, ForeignKey(f"{SCHEMA}.learning_text_snapshots.id"), nullable=False)
    learning_text_chunks_id = Column(Integer, ForeignKey(f"{SCHEMA}.learning_text_chunks.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    token_count = Column(Integer, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class TrainingJob(Base):
    __tablename__ = "training_jobs"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True)
    poc_id = Column(Integer, ForeignKey(f"{SCHEMA}.poc.id"), nullable=False)
    models_id = Column(Integer, ForeignKey(f"{SCHEMA}.models.id"), nullable=True)
    question_set_snapshots_id = Column(Integer, ForeignKey(f"{SCHEMA}.question_set_snapshots.id"), nullable=True)
    learning_text_snapshots_id = Column(Integer, ForeignKey(f"{SCHEMA}.learning_text_snapshots.id"), nullable=True)
    name = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False)
    training_mode = Column(SmallInteger, nullable=False, default=2)
    iters = Column(Integer, nullable=False, default=1000)
    batch_size = Column(Integer, nullable=False, default=4)
    learning_rate = Column(Double, nullable=False, default=0.00001)
    num_layers = Column(Integer, nullable=False, default=16)
    max_seq_length = Column(Integer, nullable=False, default=2048)
    loss_threshold = Column(Double, nullable=True)
    output_model_name = Column(String(200), nullable=True)
    instance_id = Column(String(100), nullable=True)
    error_message = Column(Text, nullable=True)
    started_at = Column(TIMESTAMP, nullable=True)
    finished_at = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
