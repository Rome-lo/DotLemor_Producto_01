import asyncio
import websockets
import json
from twitchio.ext import commands

# --- WebSocket clients connected ---
connected_clients = set()

async def websocket_handler(websocket):
    connected_clients.add(websocket)
    try:
        async for _ in websocket:
            pass
    finally:
        connected_clients.remove(websocket)

async def broadcast(event_type, data):
    if connected_clients:
        message = json.dumps({"event": event_type, "data": data})
        await asyncio.wait([ws.send(message) for ws in connected_clients])

# --- Twitch Bot ---
bot = commands.Bot(
    token="TU_TWITCH_OAUTH_TOKEN",
    prefix="!",
    initial_channels=["tu_canal_twitch"]
)

@bot.event
async def event_message(message):
    if message.echo:
        return
    print(f"Mensaje recibido: {message.author.name}: {message.content}")
    await broadcast("chat_message", {
        "user": message.author.name,
        "text": message.content
    })

async def main():
    ws_server = await websockets.serve(websocket_handler, "localhost", 8765)
    print("Servidor WebSocket activo en ws://localhost:8765")
    await asyncio.gather(bot.start(), ws_server.wait_closed())

if __name__ == "__main__":
    asyncio.run(main())
