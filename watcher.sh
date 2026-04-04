#!/bin/bash
SIGNAL_FILE="/home/z/my-project/.server_signal"
PID_FILE="/home/z/my-project/.server_pid"

while true; do
  # Check if server is running
  if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "[$(date)] Server not running, starting..." >> /home/z/my-project/watcher.log
    
    # Start server
    cd /home/z/my-project
    NODE_ENV=production node .next/standalone/server.js &
    echo $! > "$PID_FILE"
    sleep 3
  fi
  
  # Check signal file for manual restart
  if [ -f "$SIGNAL_FILE" ]; then
    echo "[$(date)] Restart signal received" >> /home/z/my-project/watcher.log
    rm -f "$SIGNAL_FILE"
    kill $(cat "$PID_FILE" 2>/dev/null) 2>/dev/null
    sleep 1
  fi
  
  sleep 1
done
