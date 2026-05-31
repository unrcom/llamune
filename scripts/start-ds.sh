#!/bin/bash
cd ~/dev/llamune
docker compose up -d db_ds
cd back
source .venv/bin/activate
CHROMA_DB_DIR=~/dev/llamune/chroma_db_ds DATABASE_URL=postgresql://llmn:llmn@localhost:5437/llmndb uvicorn app.main:app --port 8003
