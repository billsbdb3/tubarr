#!/usr/bin/env python3
import os

# Set STATIC_DIR for local development BEFORE importing app
if not os.getenv('STATIC_DIR'):
    os.environ['STATIC_DIR'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend', 'build')

import uvicorn

if __name__ == "__main__":
    print(f"STATIC_DIR: {os.getenv('STATIC_DIR')}")
    print("Starting Tubarr on http://localhost:7171")
    print("API docs: http://localhost:7171/docs")
    uvicorn.run("backend.api.main:app", host="0.0.0.0", port=7171, reload=False)
