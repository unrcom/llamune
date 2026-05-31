#!/bin/bash
cd ~/dev/llamune
docker compose up -d db_bb
cd back
source .venv/bin/activate
CHROMA_DB_DIR=~/dev/llamune/chroma_db_bb DATABASE_URL=postgresql://llmn:llmn@localhost:5435/llmndb uvicorn app.main:app --port 8001
