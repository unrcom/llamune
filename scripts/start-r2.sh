#!/bin/bash
cd ~/dev/llamune
docker compose up -d db_r2
cd back
source .venv/bin/activate
CHROMA_DB_DIR=~/dev/llamune/chroma_db_r2 DATABASE_URL=postgresql://llmn:llmn@localhost:5439/llmndb uvicorn app.main:app --port 8005
