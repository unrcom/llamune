#!/bin/bash
cd ~/dev/llamune
docker compose up -d db_ds
sleep 3
cd back
source .venv/bin/activate
cp .env.ds .env
uvicorn app.main:app --port 8003
