#!/bin/bash

echo "🚀 Starting Tubarr..."

# Start backend
cd ~/tubarr-app
python3 run.py > logs/tubarr.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID) - http://localhost:7878"

# Start frontend
cd ~/tubarr-app/frontend
npm start &
FRONTEND_PID=$!
echo "✅ Frontend starting (PID: $FRONTEND_PID) - http://localhost:3000"

echo ""
echo "📺 Tubarr is running!"
echo "   Frontend: http://localhost:3000"
echo "   API: http://localhost:7878"
echo "   API Docs: http://localhost:7878/docs"
echo ""
echo "Press Ctrl+C to stop"

wait
