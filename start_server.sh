#!/bin/bash
cd backend
source .venv/bin/activate
mkdir -p logs
setsid uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > logs/uvicorn.log 2>&1 &
echo $! > uvicorn.pid
sleep 2
