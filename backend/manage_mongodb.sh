#!/bin/bash

ACTION="${1:-status}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

case "$ACTION" in
    start)
        echo "Starting MongoDB service..."
        systemctl --user start mongodb-cloudcrackers.service 2>/dev/null || \
        ./mongodb_bin/bin/mongod --dbpath mongodb_data --logpath logs/mongod.log --fork --bind_ip 127.0.0.1,localhost --port 27017
        echo "MongoDB started."
        ;;
    stop)
        echo "Stopping MongoDB service..."
        systemctl --user stop mongodb-cloudcrackers.service 2>/dev/null || killall mongod
        echo "MongoDB stopped."
        ;;
    restart)
        echo "Restarting MongoDB service..."
        systemctl --user restart mongodb-cloudcrackers.service 2>/dev/null || { killall mongod 2>/dev/null; sleep 1; ./mongodb_bin/bin/mongod --dbpath mongodb_data --logpath logs/mongod.log --fork --bind_ip 127.0.0.1,localhost --port 27017; }
        echo "MongoDB restarted."
        ;;
    status)
        if systemctl --user is-active --quiet mongodb-cloudcrackers.service 2>/dev/null; then
            echo "MongoDB is running (via systemd user service)."
            systemctl --user status mongodb-cloudcrackers.service --no-pager
        elif pgrep -f "mongod.*mongodb_data" > /dev/null; then
            echo "MongoDB is running (manual process PID: $(pgrep -f "mongod.*mongodb_data"))."
        else
            echo "MongoDB is NOT running."
        fi
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac
