# 📂 backend/donation_api.py

from aiohttp import web
import json
from backend.event_dispatcher import broadcast
from backend.utils.logger import log

async def handle_simulate_donation(request):
    """
    Endpoint para simular una donación desde el frontend.
    """
    try:
        data = await request.json()
        log(f"🎁 Simulación de donación recibida: {data}")
        await broadcast(json.dumps({"type": "donation", "data": data}))
        return web.json_response({"status": "ok"})
    except Exception as e:
        log(f"❌ Error en simulate_donation: {e}")
        return web.json_response({"status": "error", "message": str(e)}, status=500)

async def handle_simulate_walker(request):
    """
    Endpoint para simular la creación de un nuevo caminante.
    """
    try:
        data = await request.json()
        log(f"🚶‍♂️ Simulación de caminante recibida: {data}")
        await broadcast(json.dumps({"type": "walker", "data": data}))
        return web.json_response({"status": "ok"})
    except Exception as e:
        log(f"❌ Error en simulate_walker: {e}")
        return web.json_response({"status": "error", "message": str(e)}, status=500)

# ✅ Middleware CORS
@web.middleware
async def cors_middleware(request, handler):
    if request.method == "OPTIONS":
        response = web.Response(status=200)
    else:
        response = await handler(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response

def start_api_server(host="localhost", port=8080):
    app = web.Application(middlewares=[cors_middleware])
    app.router.add_post("/simulate_donation", handle_simulate_donation)
    app.router.add_post("/simulate_walker", handle_simulate_walker)
    app.router.add_options("/simulate_donation", handle_simulate_donation)
    app.router.add_options("/simulate_walker", handle_simulate_walker)
    web.run_app(app, host=host, port=port)
