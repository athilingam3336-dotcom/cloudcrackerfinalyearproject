#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== CloudCrackers Backend Server ==="

# 1. Start MongoDB if not already active
if systemctl --user is-active --quiet mongodb-cloudcrackers.service 2>/dev/null; then
    echo "✓ MongoDB systemd user service is running."
elif pgrep -f "mongod.*mongodb_data" > /dev/null; then
    echo "✓ MongoDB process is already running."
else
    echo "Starting MongoDB..."
    if systemctl --user start mongodb-cloudcrackers.service 2>/dev/null; then
        echo "✓ MongoDB started via systemd service."
    else
        mkdir -p mongodb_data logs
        ./mongodb_bin/bin/mongod --dbpath mongodb_data --logpath logs/mongod.log --fork --bind_ip 127.0.0.1,localhost --port 27017
        echo "✓ MongoDB started in background."
    fi
fi

# 2. Activate Python virtual environment
if [ -f ".venv/bin/activate" ]; then
    echo "✓ Activating virtual environment (.venv)..."
    source .venv/bin/activate
fi

# 3. Start Uvicorn FastAPI Server
echo "✓ Starting FastAPI server on http://localhost:8000 (app.main:app) ..."
exec uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
