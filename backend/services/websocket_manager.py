from fastapi import WebSocket
from typing import List
import json

class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except:
                pass

    async def send_queue_update(self, queue_data):
        await self.broadcast({"type": "queue_update", "queue": queue_data})

    async def send_channel_update(self):
        await self.broadcast({"type": "channel_update"})

    async def send_status_update(self, status_data):
        await self.broadcast({"type": "status_update", "status": status_data})

ws_manager = WebSocketManager()
