# backend/donation_api.py (reemplaza)
import asyncio
from aiohttp import web
import aiohttp_cors
from backend.utils.logger import log
from backend.event_dispatcher import broadcast

routes = web.RouteTableDef()

@routes.post("/simulate_donation")
async def simulate_donation(request):
    data = await request.json()
    event_type = data.get("type", "donation")

    if event_type == "walker":
        event = {"type": "walker", "user": data.get("user", "Anónimo")}
        log(f"🚶 Creación walker: {event}")
    elif event_type == "donation":
        event = {"type": "donation", "user": data.get("user", "Anónimo"),
                 "amount": data.get("amount", 1), "message": data.get("message","")}
        log(f"💸 Donación simulada: {event}")
    else:
        event = {"type": event_type, "data": data}
        log(f"✨ Evento personalizado: {event_type} -> {data}")

    await broadcast(event)
    return web.json_response({"status":"ok","event":event})

async def start_api_server(host="localhost", port=8080):
    routes = web.RouteTableDef()

    @routes.post("/simulate_donation")
    async def simulate_donation(request):
        """
        Endpoint local para simular donaciones o creación de caminantes.
        """
        data = await request.json()
        log(f"💸 Simulación recibida: {data}")

        # Enviar evento a los clientes WebSocket conectados
        await broadcast(data)

        return web.json_response({"status": "ok", "data": data})

    # Crear aplicación y registrar rutas
    app = web.Application()
    app.add_routes(routes)

    # --- 🔧 CONFIGURAR CORS ---
    cors = aiohttp_cors.setup(app, defaults={
        "*": aiohttp_cors.ResourceOptions(
            allow_credentials=True,
            expose_headers="*",
            allow_headers="*",
        )
    })
    for route in list(app.router.routes()):
        cors.add(route)

    # --- 🚀 Iniciar servidor aiohttp ---
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, host, port)
    await site.start()

    log(f"🚀 API REST escuchando en http://{host}:{port}")

    # Mantener servidor activo
    while True:
        await asyncio.sleep(3600)
