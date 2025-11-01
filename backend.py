import asyncio
import json
import signal
import websockets
from aiohttp import web

connected_clients = set()
stop_event = asyncio.Event()

# --- WebSocket Handler ---
async def websocket_handler(websocket):
    connected_clients.add(websocket)
    print("🟢 Cliente conectado")

    try:
        async for message in websocket:
            data = json.loads(message)
            print(f"📩 Mensaje recibido: {data}")
            await broadcast(json.dumps(data))
    except websockets.ConnectionClosed:
        print("🔴 Cliente desconectado")
    finally:
        connected_clients.remove(websocket)


# --- Broadcast: envía mensaje a todos los clientes conectados ---
async def broadcast(message: str):
    if connected_clients:
        tasks = [asyncio.create_task(ws.send(message)) for ws in connected_clients]
        await asyncio.gather(*tasks, return_exceptions=True)


# --- HTTP Endpoint para simular donaciones ---
async def handle_simulate_donation(request):
    try:
        data = await request.json()
    except Exception:
        return web.Response(status=400, text="JSON inválido")

    donation = {
        "type": "donation",
        "user": data.get("user", "Anon"),
        "amount": data.get("amount", 1),
        "message": data.get("message", "Gracias por tu apoyo ❤️"),
    }

    print(f"💰 Donación simulada: {donation}")
    await broadcast(json.dumps(donation))
    return web.Response(text="Donación simulada enviada a los clientes conectados.")


# --- Iniciar servidores WebSocket y HTTP ---
async def main():
    websocket_server = await websockets.serve(websocket_handler, "localhost", 6789)
    print("🌐 Servidor WebSocket escuchando en ws://localhost:6789")

    app = web.Application()
    app.router.add_post("/simulate_donation", handle_simulate_donation)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "localhost", 8080)
    await site.start()
    print("💻 Servidor HTTP escuchando en http://localhost:8080")

    # Manejar cierre elegante (Ctrl+C)
    loop = asyncio.get_running_loop()
    loop.add_signal_handler(signal.SIGINT, stop_event.set)
    loop.add_signal_handler(signal.SIGTERM, stop_event.set)

    await stop_event.wait()

    print("🛑 Deteniendo servidores...")
    websocket_server.close()
    await websocket_server.wait_closed()
    await runner.cleanup()
    print("✅ Servidores detenidos correctamente.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Finalizado por el usuario")
