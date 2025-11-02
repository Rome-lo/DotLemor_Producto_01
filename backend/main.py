import asyncio
from backend.utils.config import HOST, WS_PORT, API_PORT
from backend.websocket_server import start_websocket_server
from backend.donation_api import start_api_server
from backend.utils.logger import log

async def main():
    log("Iniciando DotLemor Backend...")

    ws_task = asyncio.create_task(start_websocket_server(HOST, WS_PORT))
    api_task = asyncio.create_task(start_api_server(HOST, API_PORT))

    await asyncio.gather(ws_task, api_task)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log("🛑 Servidor detenido manualmente")
