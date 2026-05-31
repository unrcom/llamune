#!/bin/bash
cd ~/dev/llamune
docker compose up -d db_c3
cd back
source .venv/bin/activate
CHROMA_DB_DIR=~/dev/llamune/chroma_db_c3 DATABASE_URL=postgresql://llmn:llmn@localhost:5436/llmndb uvicorn app.main:app --port 8002
