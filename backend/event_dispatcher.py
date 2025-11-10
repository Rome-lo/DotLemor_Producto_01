# backend/event_dispatcher.py
import asyncio
import json
from typing import Set
from aiohttp import web, WSMsgType
from backend.utils.logger import log

# Set de clientes WebSocket conectados
connected_clients: Set[web.WebSocketResponse] = set()

# ==========================================
# GESTIÓN DE CLIENTES
# ==========================================

async def register_client(ws: web.WebSocketResponse) -> bool:
    """
    Registra un nuevo cliente WebSocket
    Retorna True si se registró exitosamente
    """
    try:
        connected_clients.add(ws)
        log(f"✅ Cliente WebSocket conectado. Total: {len(connected_clients)}")
        
        # Enviar mensaje de bienvenida
        welcome_msg = {
            "type": "connection",
            "status": "connected",
            "message": "Conectado al servidor DotLemor"
        }
        await ws.send_json(welcome_msg)
        return True
        
    except Exception as e:
        log(f"❌ Error al registrar cliente: {e}")
        return False

async def unregister_client(ws: web.WebSocketResponse) -> bool:
    """
    Desregistra un cliente WebSocket
    Retorna True si se eliminó exitosamente
    """
    try:
        if ws in connected_clients:
            connected_clients.remove(ws)
            log(f"👋 Cliente WebSocket desconectado. Total: {len(connected_clients)}")
            return True
        return False
    except Exception as e:
        log(f"❌ Error al desregistrar cliente: {e}")
        return False

def get_connected_count() -> int:
    """Retorna el número de clientes conectados"""
    return len(connected_clients)

# ==========================================
# BROADCASTING
# ==========================================

async def broadcast(event_data: dict) -> dict:
    """
    Envía un evento JSON a todos los clientes WebSocket conectados
    Retorna estadísticas del envío: {success: int, failed: int, total: int}
    """
    if not connected_clients:
        log("⚠️ No hay clientes WebSocket conectados")
        return {"success": 0, "failed": 0, "total": 0}

    message = json.dumps(event_data)
    total_clients = len(connected_clients)
    
    log(f"📢 Enviando evento a {total_clients} cliente(s): {event_data.get('type', 'unknown')}")

    success_count = 0
    failed_count = 0
    clients_to_remove = set()

    # Enviar a cada cliente con manejo de errores individual
    for ws in connected_clients:
        try:
            # Verificar si el WebSocket está cerrado
            if ws.closed:
                log(f"⚠️ WebSocket ya cerrado, marcado para eliminación")
                clients_to_remove.add(ws)
                failed_count += 1
                continue
            
            # Intentar enviar el mensaje
            await ws.send_str(message)
            success_count += 1
            
        except ConnectionResetError:
            log(f"⚠️ Conexión reseteada por cliente")
            clients_to_remove.add(ws)
            failed_count += 1
            
        except Exception as e:
            log(f"❌ Error al enviar a cliente: {type(e).__name__}: {e}")
            clients_to_remove.add(ws)
            failed_count += 1

    # Limpiar clientes muertos
    if clients_to_remove:
        for ws in clients_to_remove:
            await unregister_client(ws)
        log(f"🧹 Limpiados {len(clients_to_remove)} cliente(s) muerto(s)")

    stats = {
        "success": success_count,
        "failed": failed_count,
        "total": total_clients
    }
    
    log(f"📊 Broadcast completado: {success_count}/{total_clients} exitosos")
    return stats

async def broadcast_to_client(ws: web.WebSocketResponse, event_data: dict) -> bool:
    """
    Envía un evento a un cliente específico
    Retorna True si se envió exitosamente
    """
    try:
        if ws.closed:
            log(f"⚠️ Intento de enviar a WebSocket cerrado")
            await unregister_client(ws)
            return False
        
        message = json.dumps(event_data)
        await ws.send_str(message)
        return True
        
    except Exception as e:
        log(f"❌ Error al enviar a cliente específico: {e}")
        await unregister_client(ws)
        return False

# ==========================================
# HANDLER WEBSOCKET
# ==========================================

async def websocket_handler(request: web.Request) -> web.WebSocketResponse:
    """
    Handler principal para conexiones WebSocket
    """
    ws = web.WebSocketResponse(
        heartbeat=30.0,  # Enviar ping cada 30 segundos
        timeout=60.0     # Timeout de 60 segundos
    )
    
    await ws.prepare(request)
    
    # Registrar cliente
    registered = await register_client(ws)
    if not registered:
        await ws.close(code=1011, message="Error al registrar cliente")
        return ws
    
    client_ip = request.remote
    log(f"🔌 Nueva conexión WebSocket desde {client_ip}")
    
    try:
        # Loop principal para recibir mensajes
        async for msg in ws:
            if msg.type == WSMsgType.TEXT:
                log(f"📨 Mensaje recibido de {client_ip}: {msg.data[:100]}")
                
                try:
                    # Parsear mensaje del cliente
                    data = json.loads(msg.data)
                    
                    # Responder con echo (opcional)
                    response = {
                        "type": "echo",
                        "original": data,
                        "timestamp": asyncio.get_event_loop().time()
                    }
                    await ws.send_json(response)
                    
                except json.JSONDecodeError:
                    await ws.send_json({
                        "type": "error",
                        "message": "Invalid JSON"
                    })
                    
            elif msg.type == WSMsgType.ERROR:
                log(f"❌ Error en WebSocket de {client_ip}: {ws.exception()}")
                break
                
            elif msg.type == WSMsgType.CLOSE:
                log(f"👋 Cliente {client_ip} cerró la conexión")
                break
                
    except asyncio.CancelledError:
        log(f"⚠️ Conexión cancelada para {client_ip}")
        
    except Exception as e:
        log(f"❌ Error inesperado en WebSocket de {client_ip}: {e}")
        
    finally:
        # Cleanup
        await unregister_client(ws)
        if not ws.closed:
            await ws.close()
        log(f"🔌 Conexión WebSocket cerrada para {client_ip}")
    
    return ws

# ==========================================
# UTILIDADES
# ==========================================

async def cleanup_dead_connections():
    """
    Limpia conexiones WebSocket muertas periódicamente
    Llamar esta función en un task separado
    """
    while True:
        try:
            await asyncio.sleep(30)  # Cada 30 segundos
            
            dead_clients = set()
            for ws in connected_clients:
                if ws.closed:
                    dead_clients.add(ws)
            
            if dead_clients:
                for ws in dead_clients:
                    await unregister_client(ws)
                log(f"🧹 Limpieza automática: {len(dead_clients)} conexiones muertas")
                
        except asyncio.CancelledError:
            break
        except Exception as e:
            log(f"❌ Error en limpieza automática: {e}")

async def send_heartbeat():
    """
    Envía heartbeat a todos los clientes para mantener conexiones vivas
    """
    while True:
        try:
            await asyncio.sleep(25)  # Cada 25 segundos
            
            if connected_clients:
                heartbeat = {
                    "type": "heartbeat",
                    "timestamp": asyncio.get_event_loop().time()
                }
                await broadcast(heartbeat)
                
        except asyncio.CancelledError:
            break
        except Exception as e:
            log(f"❌ Error en heartbeat: {e}")

# ==========================================
# ESTADÍSTICAS
# ==========================================

def get_stats() -> dict:
    """Retorna estadísticas del dispatcher"""
    return {
        "connected_clients": len(connected_clients),
        "client_list": [
            {
                "closed": ws.closed,
                "id": id(ws)
            }
            for ws in connected_clients
        ]
    }