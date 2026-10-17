#!/bin/bash
# Stops whatever ux:up started. Only ever the process on :8790.
pids=$(lsof -ti tcp:8790 || true)
if [ -z "$pids" ]; then
  echo "Nothing running on :8790."
  exit 0
fi
kill $pids
echo "Stopped the preview on :8790."
