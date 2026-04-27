#!/bin/bash
cd ~/dev/llamune/back
source ~/.venv/bin/activate
set -a && source .env && set +a
uvicorn app.main:app --host 0.0.0.0 --port 8000
