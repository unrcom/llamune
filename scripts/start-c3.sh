#!/bin/bash
cd ~/dev/llamune
docker compose up -d db_c3
sleep 3
cd back
source .venv/bin/activate
cp .env.c3 .env
uvicorn app.main:app --port 8002
