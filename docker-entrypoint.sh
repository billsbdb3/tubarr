#!/bin/bash
set -e

# Create config directory if it doesn't exist
mkdir -p ${TUBARR_CONFIG_PATH}
mkdir -p ${TUBARR_DOWNLOADS_PATH}

# Run database migrations
echo "Running database migrations..."
python3 /app/backend/migrate.py

# Start the backend (frontend build is already in place)
cd /app
exec python3 -m uvicorn backend.api.main:app --host 0.0.0.0 --port 7171
