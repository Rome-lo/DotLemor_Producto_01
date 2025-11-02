import asyncio
import json
import websockets
from websockets.server import serve
from backend.utils.logger import log
from backend.event_dispatcher import connected_clients, broadcast

async def websocket_handler(websocket):
    connected_clients.add(websocket)
    log("Cliente WebSocket conectado")

    try:
        async for message in websocket:
            data = json.loads(message)
            log(f"📩 Mensaje recibido: {data}")
            await broadcast(data)
    except Exception as e:
        log(f"⚠️ Error en conexión: {e}")
    finally:
        connected_clients.remove(websocket)
        log("Cliente WebSocket desconectado")

async def start_websocket_server(host, port):
    async with serve(websocket_handler, host, port):
        log(f"🌐 Servidor WebSocket escuchando en ws://{host}:{port}")
        await asyncio.Future()  # Mantener activo
