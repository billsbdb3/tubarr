#!/bin/bash
set -e

# Create config directory if it doesn't exist
mkdir -p ${TUBARR_CONFIG_PATH}
mkdir -p ${TUBARR_DOWNLOADS_PATH}

# Copy frontend build to serve
cp -r /app/frontend/build /app/static

# Start the backend
cd /app
exec python3 -m uvicorn backend.api.main:app --host 0.0.0.0 --port 7171
