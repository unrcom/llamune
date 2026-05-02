CREATE SCHEMA IF NOT EXISTS llmn;

SET search_path TO llmn;

-- 認証
CREATE TABLE users (
    id           SERIAL PRIMARY KEY,
    username     VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role         VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
    id         SERIAL PRIMARY KEY,
    users_id   INTEGER NOT NULL REFERENCES llmn.users(id) ON DELETE CASCADE,
    token      TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- プロジェクト
CREATE TABLE projects (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- モデル
CREATE TABLE models (
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(255) NOT NULL,
    display_name     VARCHAR(255) NOT NULL,
    model_type       VARCHAR(20) NOT NULL DEFAULT 'base', -- base | fine-tuned
    adapter_path     TEXT,
    parent_models_id INTEGER REFERENCES llmn.models(id),
    trained_at       TIMESTAMP,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- システムプロンプト
CREATE TABLE system_prompts (
    id         SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES llmn.projects(id) ON DELETE CASCADE,
    name       VARCHAR(100) NOT NULL,
    content    TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 質問セット
CREATE TABLE question_sets (
    id                SERIAL PRIMARY KEY,
    project_id        INTEGER NOT NULL REFERENCES llmn.projects(id) ON DELETE CASCADE,
    system_prompts_id INTEGER REFERENCES llmn.system_prompts(id),
    name              VARCHAR(100) NOT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- FT会話データ
CREATE TABLE ft_conversations (
    id               SERIAL PRIMARY KEY,
    project_id       INTEGER NOT NULL REFERENCES llmn.projects(id) ON DELETE CASCADE,
    question_sets_id INTEGER REFERENCES llmn.question_sets(id),
    messages         JSONB NOT NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);
