#!/bin/bash
while true; do
  cd /home/z/my-project
  node node_modules/.bin/next dev -p 3000
  echo "[$(date)] Server died, restarting in 1s..." >> /home/z/my-project/supervisor.log
  sleep 1
done
