# backend/donation_api.py
import asyncio
from aiohttp import web
import aiohttp_cors
from datetime import datetime, timedelta
from collections import defaultdict

# Importar tus utilidades existentes
from backend.utils.logger import log
from backend.event_dispatcher import broadcast

# ==========================================
# CONFIGURACIÓN
# ==========================================
RATE_LIMIT_REQUESTS = 10  # máximo de requests
RATE_LIMIT_WINDOW = 60    # por minuto
MAX_AMOUNT = 10000
MAX_USER_LENGTH = 50
MAX_MESSAGE_LENGTH = 200

# ==========================================
# RATE LIMITING
# ==========================================
request_tracker = defaultdict(list)

def check_rate_limit(ip: str) -> bool:
    """Verifica si la IP ha excedido el rate limit"""
    now = datetime.now()
    cutoff = now - timedelta(seconds=RATE_LIMIT_WINDOW)
    
    # Limpiar requests antiguos
    request_tracker[ip] = [
        req_time for req_time in request_tracker[ip] 
        if req_time > cutoff
    ]
    
    if len(request_tracker[ip]) >= RATE_LIMIT_REQUESTS:
        return False
    
    request_tracker[ip].append(now)
    return True

# ==========================================
# VALIDACIONES
# ==========================================
def validate_donation_data(data: dict) -> tuple[bool, str, dict]:
    """
    Valida y sanitiza los datos de donación
    Retorna: (es_válido, mensaje_error, datos_sanitizados)
    """
    try:
        # Tipo de evento
        event_type = data.get("type", "donation")
        
        # Usuario
        user = str(data.get("user", "Anónimo"))[:MAX_USER_LENGTH]
        
        if event_type == "walker":
            # Para walkers solo necesitamos el usuario
            sanitized = {
                "type": "walker",
                "user": user,
                "timestamp": datetime.now().isoformat()
            }
            return True, "", sanitized
            
        elif event_type == "donation":
            # Para donaciones validamos el monto
            amount = data.get("amount")
            
            # Validar que amount sea numérico
            try:
                amount = float(amount)
            except (TypeError, ValueError):
                return False, "Amount must be a number", {}
            
            # Validar rango
            if amount <= 0:
                return False, "Amount must be positive", {}
            if amount > MAX_AMOUNT:
                return False, f"Amount exceeds maximum (${MAX_AMOUNT})", {}
            
            # Mensaje opcional
            message = str(data.get("message", ""))[:MAX_MESSAGE_LENGTH]
            
            sanitized = {
                "type": "donation",
                "user": user,
                "amount": round(amount, 2),
                "message": message,
                "timestamp": datetime.now().isoformat()
            }
            return True, "", sanitized
            
        else:
            # Evento personalizado
            sanitized = {
                "type": event_type,
                "data": data,
                "timestamp": datetime.now().isoformat()
            }
            return True, "", sanitized
            
    except Exception as e:
        log(f"❌ Error en validación: {e}")
        return False, "Invalid data format", {}

# ==========================================
# RUTAS
# ==========================================
routes = web.RouteTableDef()

@routes.post("/simulate_donation")
async def simulate_donation(request):
    """
    Endpoint para simular donaciones, walkers y eventos personalizados.
    """
    client_ip = request.remote
    
    try:
        # 1. Rate limiting
        if not check_rate_limit(client_ip):
            log(f"⚠️ Rate limit excedido: {client_ip}")
            return web.json_response(
                {"status": "error", "message": "Rate limit exceeded"},
                status=429
            )
        
        # 2. Parsear datos
        try:
            data = await request.json()
        except Exception:
            return web.json_response(
                {"status": "error", "message": "Invalid JSON"},
                status=400
            )
        
        # 3. Validar y sanitizar
        is_valid, error_msg, sanitized_event = validate_donation_data(data)
        
        if not is_valid:
            log(f"❌ Validación fallida desde {client_ip}: {error_msg}")
            return web.json_response(
                {"status": "error", "message": error_msg},
                status=400
            )
        
        # 4. Log del evento
        event_type = sanitized_event.get("type")
        if event_type == "walker":
            log(f"🚶 Walker creado: {sanitized_event['user']} (IP: {client_ip})")
        elif event_type == "donation":
            log(f"💸 Donación: ${sanitized_event['amount']} de {sanitized_event['user']} (IP: {client_ip})")
        else:
            log(f"✨ Evento {event_type} desde {client_ip}")
        
        # 5. Broadcasting a WebSockets
        try:
            await broadcast(sanitized_event)
        except Exception as e:
            log(f"⚠️ Error en broadcast: {e}")
            # No fallar la request por error en broadcast
        
        # 6. Respuesta exitosa
        return web.json_response({
            "status": "ok",
            "event": sanitized_event
        }, status=200)
        
    except Exception as e:
        log(f"❌ Error interno en simulate_donation: {e}")
        return web.json_response(
            {"status": "error", "message": "Internal server error"},
            status=500
        )

@routes.get("/health")
async def health_check(request):
    """Endpoint para verificar salud del servidor"""
    return web.json_response({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    })

@routes.get("/stats")
async def get_stats(request):
    """Endpoint para estadísticas del servidor"""
    total_requests = sum(len(reqs) for reqs in request_tracker.values())
    active_ips = len(request_tracker)
    
    return web.json_response({
        "total_requests_last_minute": total_requests,
        "active_ips": active_ips,
        "timestamp": datetime.now().isoformat()
    })

# ==========================================
# INICIALIZACIÓN DEL SERVIDOR
# ==========================================
async def start_api_server(host="localhost", port=8080):
    """
    Inicia el servidor API REST con CORS configurado
    """
    # Crear aplicación
    app = web.Application()
    
    # Registrar rutas
    app.add_routes(routes)
    
    # Configurar CORS (restringido a orígenes específicos)
    cors = aiohttp_cors.setup(app, defaults={
        "http://127.0.0.1:5500": aiohttp_cors.ResourceOptions(
            allow_credentials=True,
            expose_headers="*",
            allow_headers="*",
            allow_methods=["GET", "POST"]
        ),
        "http://localhost:5500": aiohttp_cors.ResourceOptions(
            allow_credentials=True,
            expose_headers="*",
            allow_headers="*",
            allow_methods=["GET", "POST"]
        )
    })
    
    # Aplicar CORS a todas las rutas
    for route in list(app.router.routes()):
        cors.add(route)
    
    # Iniciar servidor
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, host, port)
    await site.start()
    
    log(f"🚀 API REST escuchando en http://{host}:{port}")
    log(f"📊 Endpoints disponibles:")
    log(f"   POST /simulate_donation - Crear eventos")
    log(f"   GET  /health - Estado del servidor")
    log(f"   GET  /stats - Estadísticas de uso")
    
    # Mantener servidor activo
    try:
        while True:
            await asyncio.sleep(3600)
    except KeyboardInterrupt:
        log("🛑 Servidor detenido por usuario")
    finally:
        await runner.cleanup()

# ==========================================
# MAIN
# ==========================================
if __name__ == "__main__":
    try:
        asyncio.run(start_api_server())
    except KeyboardInterrupt:
        log("👋 Servidor finalizado")