#!/bin/bash
cd ~/dev/llamune
docker compose up -d db_bb
sleep 3
cd back
source .venv/bin/activate
cp .env.bb .env
uvicorn app.main:app --port 8001
