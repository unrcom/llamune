#!/bin/bash
cd ~/dev/llamune
docker compose up -d db_r2
sleep 3
cd back
source .venv/bin/activate
cp .env.r2 .env
uvicorn app.main:app --port 8005
