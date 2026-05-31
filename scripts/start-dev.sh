#!/bin/bash
cd ~/dev/llamune
docker compose up -d db_dev
cd back
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
