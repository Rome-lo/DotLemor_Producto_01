import asyncio
import json
from backend.utils.logger import log

connected_clients = set()

async def broadcast(event_data: dict):
    """Envía un evento JSON a todos los clientes WebSocket conectados"""
    if not connected_clients:
        log("No hay clientes WebSocket conectados")
        return

    message = json.dumps(event_data)
    log(f"📢 Enviando evento a {len(connected_clients)} clientes: {message}")

    tasks = [asyncio.create_task(ws.send(message)) for ws in connected_clients]
    await asyncio.gather(*tasks, return_exceptions=True)
