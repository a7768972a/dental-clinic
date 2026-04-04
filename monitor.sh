#!/bin/bash
while true; do
  # Check if server is running
  if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "[$(date)] Starting server..." >> /home/z/my-project/server.log
    cd /home/z/my-project
    bun run start >> /home/z/my-project/server.log 2>&1 &
    sleep 3
  fi
  sleep 2
done
