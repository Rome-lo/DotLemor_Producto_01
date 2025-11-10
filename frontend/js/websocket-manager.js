// frontend/js/websocket-manager.js
/**
 * Gestor de WebSocket con reconexión automática
 */

export class WebSocketManager {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.listeners = new Map();
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    this.reconnectAttempts = 0;
    this.isManualClose = false;
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.warn('WebSocket ya está conectado');
      return;
    }

    this.emit('connecting');
    
    try {
      this.ws = new WebSocket(this.url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('Error al crear WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  setupEventHandlers() {
    this.ws.onopen = () => {
      console.log('✅ WebSocket conectado');
      this.reconnectDelay = 1000;
      this.reconnectAttempts = 0;
      this.emit('open');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 Mensaje recibido:', data);
        
        // Emitir evento específico por tipo
        if (data.type) {
          this.emit(data.type, data);
        }
        
        // Emitir evento genérico
        this.emit('message', data);
        
      } catch (error) {
        console.error('Error al parsear mensaje:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('❌ Error WebSocket:', error);
      this.emit('error', error);
    };

    this.ws.onclose = (event) => {
      console.log('👋 WebSocket cerrado:', event.code, event.reason);
      this.emit('close', event);
      
      // Reconectar solo si no fue cierre manual
      if (!this.isManualClose) {
        this.scheduleReconnect();
      }
    };
  }

  scheduleReconnect() {
    this.reconnectAttempts++;
    
    console.log(
      `🔄 Reconectando en ${this.reconnectDelay}ms (intento ${this.reconnectAttempts})...`
    );
    
    setTimeout(() => {
      this.connect();
      
      // Incrementar delay exponencialmente
      this.reconnectDelay = Math.min(
        this.reconnectDelay * 1.5,
        this.maxReconnectDelay
      );
    }, this.reconnectDelay);
  }

  send(data) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket no está conectado');
      return false;
    }

    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.ws.send(message);
      return true;
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      return false;
    }
  }

  close() {
    this.isManualClose = true;
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
  }

  off(eventType, callback) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(eventType, data) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error en listener ${eventType}:`, error);
        }
      });
    }
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  getState() {
    if (!this.ws) return 'CLOSED';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }
}