#!/bin/bash
cd ~/dev/llamune
docker compose up -d db_dev
sleep 3
cd back
source .venv/bin/activate
cp .env.dev .env
uvicorn app.main:app --port 8000
