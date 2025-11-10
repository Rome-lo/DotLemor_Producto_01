# backend/main.py
"""
Servidor principal de DotLemor
Integra API REST + WebSockets
"""
import asyncio
from aiohttp import web
import aiohttp_cors

from backend.donation_api import routes as api_routes
from backend.event_dispatcher import (
    websocket_handler,
    cleanup_dead_connections,
    send_heartbeat,
    get_stats as get_ws_stats
)
from backend.utils.logger import log

# ==========================================
# CONFIGURACIÓN
# ==========================================
CONFIG = {
    "host": "127.0.0.1",
    "port": 8080,
    "cors_origins": [
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ]
}

# ==========================================
# RUTAS ADICIONALES
# ==========================================
async def websocket_stats(request):
    """Endpoint para ver estadísticas de WebSockets"""
    stats = get_ws_stats()
    return web.json_response(stats)

# ==========================================
# APLICACIÓN PRINCIPAL
# ==========================================
def create_app():
    """Crea y configura la aplicación aiohttp"""
    app = web.Application()
    
    # 1. Registrar rutas de API REST
    app.add_routes(api_routes)
    
    # 2. Registrar WebSocket
    app.router.add_get('/ws', websocket_handler)
    
    # 3. Registrar stats de WebSocket
    app.router.add_get('/ws/stats', websocket_stats)
    
    # 4. Configurar CORS
    cors = aiohttp_cors.setup(app, defaults={
        origin: aiohttp_cors.ResourceOptions(
            allow_credentials=True,
            expose_headers="*",
            allow_headers="*",
            allow_methods=["GET", "POST", "OPTIONS"]
        )
        for origin in CONFIG["cors_origins"]
    })
    
    # Aplicar CORS a todas las rutas
    for route in list(app.router.routes()):
        cors.add(route)
    
    # 5. Background tasks
    async def start_background_tasks(app):
        """Inicia tareas en background"""
        app['cleanup_task'] = asyncio.create_task(cleanup_dead_connections())
        app['heartbeat_task'] = asyncio.create_task(send_heartbeat())
        log("✅ Tareas en background iniciadas")
    
    async def cleanup_background_tasks(app):
        """Limpia tareas en background"""
        app['cleanup_task'].cancel()
        app['heartbeat_task'].cancel()
        await asyncio.gather(
            app['cleanup_task'],
            app['heartbeat_task'],
            return_exceptions=True
        )
        log("🧹 Tareas en background finalizadas")
    
    # Registrar startup/cleanup hooks
    app.on_startup.append(start_background_tasks)
    app.on_cleanup.append(cleanup_background_tasks)
    
    return app

# ==========================================
# MAIN
# ==========================================
async def main():
    """Función principal"""
    log("=" * 50)
    log("🎮 DOTLEMOR SERVER")
    log("=" * 50)
    
    # Crear aplicación
    app = create_app()
    
    # Iniciar servidor
    runner = web.AppRunner(app)
    await runner.setup()
    
    site = web.TCPSite(
        runner,
        CONFIG["host"],
        CONFIG["port"]
    )
    
    await site.start()
    
    log(f"")
    log(f"🚀 Servidor iniciado en http://{CONFIG['host']}:{CONFIG['port']}")
    log(f"")
    log(f"📡 Endpoints disponibles:")
    log(f"   REST API:")
    log(f"      POST /simulate_donation  - Simular eventos")
    log(f"      GET  /health             - Estado del servidor")
    log(f"      GET  /stats              - Estadísticas de API")
    log(f"")
    log(f"   WebSocket:")
    log(f"      WS   /ws                 - Conexión WebSocket")
    log(f"      GET  /ws/stats           - Estadísticas de WS")
    log(f"")
    log(f"✅ Servidor listo. Presiona Ctrl+C para detener.")
    log(f"")
    
    # Mantener servidor vivo
    try:
        while True:
            await asyncio.sleep(3600)
    except KeyboardInterrupt:
        log("")
        log("🛑 Señal de interrupción recibida...")
    finally:
        log("🧹 Limpiando recursos...")
        await runner.cleanup()
        log("👋 Servidor finalizado correctamente")

# ==========================================
# ENTRY POINT
# ==========================================
if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass  # Ya manejado en main()
    except Exception as e:
        log(f"❌ Error fatal: {e}")
        raise