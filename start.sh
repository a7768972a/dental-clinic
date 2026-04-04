#!/bin/bash
cd /home/z/my-project
while true; do
  node node_modules/.bin/next dev -p 3000
  echo "Server crashed, restarting in 2 seconds..."
  sleep 2
done
