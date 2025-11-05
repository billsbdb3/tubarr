#!/usr/bin/env python3
import uvicorn
from backend.api.main import app

if __name__ == "__main__":
    print("Starting Tubarr on http://localhost:7878")
    print("API docs: http://localhost:7878/docs")
    uvicorn.run(app, host="0.0.0.0", port=7878)
