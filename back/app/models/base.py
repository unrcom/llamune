from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, Boolean, ForeignKey, Float
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func

class StrictBase:
    def __setattr__(self, key, value):
        if not key.startswith('_') and hasattr(self.__class__, '__table__'):
            if key not in self.__class__.__table__.columns.keys():
                raise AttributeError(f"Column '{key}' does not exist in {self.__class__.__name__}")
        super().__setattr__(key, value)

Base = declarative_base(cls=StrictBase)
SCHEMA = "llmn"


class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": SCHEMA}

    id            = Column(Integer, primary_key=True)
    username      = Column(String(100), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    role          = Column(String(20), nullable=False, default="user")
    created_at    = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    @property
    def is_admin(self):
        return self.role == "admin"


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    __table_args__ = {"schema": SCHEMA}

    id         = Column(Integer, primary_key=True)
    users_id   = Column(Integer, ForeignKey(f"{SCHEMA}.users.id", ondelete="CASCADE"), nullable=False)
    token      = Column(Text, nullable=False, unique=True)
    expires_at = Column(TIMESTAMP, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class Project(Base):
    __tablename__ = "projects"
    __table_args__ = {"schema": SCHEMA}

    id           = Column(Integer, primary_key=True)
    name         = Column(String(100), nullable=False, unique=True)
    display_name = Column(String(100), nullable=False)
    created_at   = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class Model(Base):
    __tablename__ = "models"
    __table_args__ = {"schema": SCHEMA}

    id               = Column(Integer, primary_key=True)
    name             = Column(String(255), nullable=False)
    display_name     = Column(String(255), nullable=False)
    model_type       = Column(String(20), nullable=False, default="base")
    adapter_path     = Column(Text, nullable=True)
    parent_models_id = Column(Integer, ForeignKey(f"{SCHEMA}.models.id"), nullable=True)
    trained_at       = Column(TIMESTAMP, nullable=True)
    created_at       = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class SystemPrompt(Base):
    __tablename__ = "system_prompts"
    __table_args__ = {"schema": SCHEMA}

    id         = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey(f"{SCHEMA}.projects.id", ondelete="CASCADE"), nullable=False)
    name       = Column(String(100), nullable=False)
    content    = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class QuestionSet(Base):
    __tablename__ = "question_sets"
    __table_args__ = {"schema": SCHEMA}

    id                = Column(Integer, primary_key=True)
    project_id        = Column(Integer, ForeignKey(f"{SCHEMA}.projects.id", ondelete="CASCADE"), nullable=False)
    system_prompts_id = Column(Integer, ForeignKey(f"{SCHEMA}.system_prompts.id"), nullable=True)
    name              = Column(String(100), nullable=False)
    status            = Column(String(20), nullable=False, default="draft")
    created_at        = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class FtConversation(Base):
    __tablename__ = "ft_conversations"
    __table_args__ = {"schema": SCHEMA}

    id         = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey(f"{SCHEMA}.projects.id", ondelete="CASCADE"), nullable=False)
    is_base    = Column(Boolean, nullable=False, default=False)
    base_id    = Column(Integer, ForeignKey(f"{SCHEMA}.ft_conversations.id"), nullable=True)
    split      = Column(String(10), nullable=False, default="train")
    messages   = Column(JSONB, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class TrainingJob(Base):
    __tablename__ = "training_jobs"
    __table_args__ = {"schema": SCHEMA}

    id             = Column(Integer, primary_key=True)
    project_id     = Column(Integer, ForeignKey(f"{SCHEMA}.projects.id", ondelete="CASCADE"), nullable=False)
    models_id      = Column(Integer, ForeignKey(f"{SCHEMA}.models.id"), nullable=False)
    status         = Column(String(20), nullable=False, default="pending")
    training_mode  = Column(Integer, nullable=False, default=2)
    max_seq_length = Column(Integer, nullable=False, default=8192)
    iters          = Column(Integer, nullable=False, default=100)
    batch_size     = Column(Integer, nullable=False, default=1)
    learning_rate  = Column(Float, nullable=True)
    adapter_path   = Column(Text, nullable=True)
    error_message  = Column(Text, nullable=True)
    log            = Column(Text, nullable=True)
    started_at     = Column(TIMESTAMP, nullable=True)
    finished_at    = Column(TIMESTAMP, nullable=True)
    created_at     = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class Dataset(Base):
    __tablename__ = "datasets"
    __table_args__ = {"schema": SCHEMA}

    id           = Column(Integer, primary_key=True)
    project_id   = Column(Integer, ForeignKey(f"{SCHEMA}.projects.id", ondelete="CASCADE"), nullable=False)
    name         = Column(String(100), nullable=False, unique=True)
    display_name = Column(String(100), nullable=False)
    description  = Column(Text, nullable=True)
    created_at   = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class ChatLog(Base):
    __tablename__ = "chat_logs"
    __table_args__ = {"schema": SCHEMA}

    id               = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    session_id       = Column(UUID(as_uuid=True), nullable=False)
    turn_cnt         = Column(Integer, nullable=False)
    model_name       = Column(Text, nullable=False)
    user_message     = Column(Text, nullable=False)
    search_mode      = Column(Text, nullable=False)
    rag_query        = Column(Text, nullable=True)
    rag_result       = Column(Text, nullable=True)
    system_prompt    = Column(Text, nullable=False)
    llm_response     = Column(Text, nullable=False)
    response_time_ms = Column(Integer, nullable=False)
    created_at       = Column(TIMESTAMP, server_default=func.now(), nullable=False)
