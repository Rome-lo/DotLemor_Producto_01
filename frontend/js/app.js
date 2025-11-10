// frontend/js/app.js
/**
 * Punto de entrada principal de DotLemor
 * Integra WebSocket, API REST, y Game Loop
 */

import { WebSocketManager } from './websocket-manager.js';
import { APIClient } from './api-client.js';
import { setupControls } from './controls.js';
import { createWalker, updateWalkers, getWalkers } from './walker.js';
import { createDonation, updateDonations, getDonations } from './donations.js';
import { createObject, updateObjects, getObjects } from './object.js';

// ==========================================
// CONFIGURACIÓN GLOBAL
// ==========================================
const CONFIG = {
  api: {
    baseUrl: 'http://127.0.0.1:8080',
    timeout: 5000
  },
  websocket: {
    url: 'ws://127.0.0.1:8080/ws'
  },
  canvas: {
    backgroundColor: '#2d3436',
    groundColor: '#636e72'
  },
  game: {
    groundY: 436,  // Ajustado para canvas de 500px de alto (500 - 64 = 436)
    targetFPS: 60
  }
};

// ==========================================
// ESTADO GLOBAL
// ==========================================
const state = {
  canvas: null,
  ctx: null,
  isRunning: false,
  
  // Performance
  lastFrameTime: 0,
  fps: 0,
  frameCount: 0,
  lastFpsUpdate: 0,
  
  // Conexiones
  wsManager: null,
  apiClient: null,
  isConnected: false,
  connectionStartTime: null,
  wsEventCount: 0,
  
  // UI Elements
  elements: {}
};

// ==========================================
// INICIALIZACIÓN
// ==========================================
async function init() {
  console.log('🎮 Iniciando DotLemor...');
  
  try {
    // 1. Obtener elementos del DOM
    initDOMElements();
    
    // 2. Inicializar canvas
    initCanvas();
    
    // 3. Inicializar API Client
    state.apiClient = new APIClient(CONFIG.api.baseUrl, CONFIG.api.timeout);
    
    // 4. Verificar backend
    const isBackendReady = await checkBackend();
    if (!isBackendReady) {
      showNotification('Backend no disponible. Algunas funciones no estarán disponibles.', 'warning');
    }
    
    // 5. Inicializar WebSocket
    initWebSocket();
    
    // 6. Configurar controles
    setupControls(
      handleCreateWalker,
      handleCreateDonation,
      handleCustomDonation
    );
    
    // 7. Iniciar game loop
    startGameLoop();
    
    // 8. Iniciar monitoreo
    startMonitoring();
    
    console.log('✅ DotLemor iniciado correctamente');
    
  } catch (error) {
    console.error('❌ Error al iniciar DotLemor:', error);
    showNotification('Error al inicializar la aplicación', 'error');
  }
}

// ==========================================
// INICIALIZACIÓN DE ELEMENTOS
// ==========================================
function initDOMElements() {
  state.elements = {
    // Status
    wsIndicator: document.getElementById('wsIndicator'),
    wsStatus: document.getElementById('wsStatus'),
    apiIndicator: document.getElementById('apiIndicator'),
    apiStatus: document.getElementById('apiStatus'),
    
    // Debug
    fps: document.getElementById('fps'),
    walkerCount: document.getElementById('walkerCount'),
    donationCount: document.getElementById('donationCount'),
    objectCount: document.getElementById('objectCount'),
    wsEventCount: document.getElementById('wsEventCount'),
    connectionTime: document.getElementById('connectionTime'),
    
    // Buttons
    btnWalker: document.getElementById('btnWalker'),
    btnDonation: document.getElementById('btnDonation'),
    btnSendDonation: document.getElementById('btnSendDonation'),
    
    // Inputs
    donationAmount: document.getElementById('donationAmount'),
    donationUser: document.getElementById('donationUser'),
    donationMessage: document.getElementById('donationMessage')
  };
}

function initCanvas() {
  state.canvas = document.getElementById('gameCanvas');
  if (!state.canvas) {
    throw new Error('Canvas no encontrado');
  }
  
  state.ctx = state.canvas.getContext('2d', {
    alpha: false,
    desynchronized: true
  });
  
  console.log('✅ Canvas inicializado');
}

// ==========================================
// BACKEND CONNECTION
// ==========================================
async function checkBackend() {
  try {
    const response = await state.apiClient.get('/health');
    
    if (response && response.status === 'healthy') {
      updateAPIStatus(true);
      console.log('✅ Backend conectado');
      return true;
    }
    
    updateAPIStatus(false);
    return false;
    
  } catch (error) {
    console.warn('⚠️ Backend no disponible:', error.message);
    updateAPIStatus(false);
    return false;
  }
}

function updateAPIStatus(isConnected) {
  if (state.elements.apiIndicator && state.elements.apiStatus) {
    state.elements.apiIndicator.className = `status-indicator ${isConnected ? 'connected' : 'disconnected'}`;
    state.elements.apiStatus.textContent = `API: ${isConnected ? 'Conectada' : 'Desconectada'}`;
  }
}

// ==========================================
// WEBSOCKET
// ==========================================
function initWebSocket() {
  state.wsManager = new WebSocketManager(CONFIG.websocket.url);
  
  // Eventos de conexión
  state.wsManager.on('open', () => {
    console.log('✅ WebSocket conectado');
    state.isConnected = true;
    state.connectionStartTime = Date.now();
    updateWSStatus('connected', 'Conectado');
    showNotification('Conectado al servidor', 'success');
  });
  
  state.wsManager.on('close', () => {
    console.log('❌ WebSocket desconectado');
    state.isConnected = false;
    updateWSStatus('disconnected', 'Desconectado');
  });
  
  state.wsManager.on('connecting', () => {
    console.log('🔄 Conectando...');
    updateWSStatus('connecting', 'Conectando...');
  });
  
  state.wsManager.on('error', (error) => {
    console.error('❌ Error WebSocket:', error);
    showNotification('Error de conexión WebSocket', 'error');
  });
  
  // Eventos de datos
  state.wsManager.on('connection', (data) => {
    console.log('📡 Mensaje de bienvenida:', data.message);
  });
  
  state.wsManager.on('walker', (data) => {
    console.log('🚶 Evento walker recibido:', data);
    state.wsEventCount++;
    handleWalkerEvent(data);
  });
  
  state.wsManager.on('donation', (data) => {
    console.log('💰 Evento donation recibido:', data);
    state.wsEventCount++;
    handleDonationEvent(data);
  });
  
  state.wsManager.on('heartbeat', () => {
    // Heartbeat recibido, conexión viva
  });
  
  // Conectar
  state.wsManager.connect();
}

function updateWSStatus(status, text) {
  if (state.elements.wsIndicator && state.elements.wsStatus) {
    state.elements.wsIndicator.className = `status-indicator ${status}`;
    state.elements.wsStatus.textContent = `WebSocket: ${text}`;
  }
}

// ==========================================
// EVENT HANDLERS
// ==========================================
async function handleCreateWalker() {
  try {
    setButtonLoading('btnWalker', true);
    
    const response = await state.apiClient.post('/simulate_donation', {
      type: 'walker',
      user: 'Usuario' + Math.floor(Math.random() * 1000)
    });
    
    if (response.status === 'ok') {
      // El evento llegará por WebSocket, pero podemos crear uno local también
      // para feedback inmediato si WebSocket no está conectado
      if (!state.isConnected) {
        createWalkerLocal();
      }
    }
    
  } catch (error) {
    console.error('Error al crear walker:', error);
    showNotification('Error al crear walker: ' + error.message, 'error');
    
    // Crear walker local como fallback
    createWalkerLocal();
    
  } finally {
    setButtonLoading('btnWalker', false);
  }
}

async function handleCreateDonation() {
  try {
    setButtonLoading('btnDonation', true);
    
    const amounts = [5, 10, 25, 50, 100, 250];
    const users = ['Viewer1', 'Donador2', 'Fan3', 'Supporter4'];
    
    const response = await state.apiClient.post('/simulate_donation', {
      type: 'donation',
      amount: amounts[Math.floor(Math.random() * amounts.length)],
      user: users[Math.floor(Math.random() * users.length)],
      message: '¡Gracias por el stream!'
    });
    
    if (response.status === 'ok') {
      if (!state.isConnected) {
        createDonationLocal(response.event.amount, response.event.user);
      }
    }
    
  } catch (error) {
    console.error('Error al crear donación:', error);
    showNotification('Error al crear donación: ' + error.message, 'error');
    
    // Crear donación local como fallback
    createDonationLocal(10, 'Usuario');
    
  } finally {
    setButtonLoading('btnDonation', false);
  }
}

async function handleCustomDonation(amount, user, message) {
  try {
    setButtonLoading('btnSendDonation', true);
    
    const response = await state.apiClient.post('/simulate_donation', {
      type: 'donation',
      amount: parseFloat(amount),
      user: user || 'Anónimo',
      message: message || ''
    });
    
    if (response.status === 'ok') {
      showNotification(`💰 Donación de $${amount} enviada`, 'success');
      
      if (!state.isConnected) {
        createDonationLocal(amount, user);
      }
      
      // Limpiar formulario
      if (state.elements.donationAmount) state.elements.donationAmount.value = '';
      if (state.elements.donationUser) state.elements.donationUser.value = '';
      if (state.elements.donationMessage) state.elements.donationMessage.value = '';
    }
    
  } catch (error) {
    console.error('Error al enviar donación:', error);
    showNotification('Error: ' + error.message, 'error');
  } finally {
    setButtonLoading('btnSendDonation', false);
  }
}

// ==========================================
// WEBSOCKET EVENT HANDLERS
// ==========================================
function handleWalkerEvent(data) {
  createWalkerLocal(data.user);
  showNotification(`👤 ${data.user} ha llegado`, 'success');
}

function handleDonationEvent(data) {
  createDonationLocal(data.amount, data.user, data.message);
  createObject(); // Crear objeto coleccionable
  
  const effectType = data.effect || 'basic';
  showNotification(
    `💰 ${data.user} donó $${data.amount}!`,
    effectType === 'mega' ? 'success' : 'success'
  );
}

// ==========================================
// FUNCIONES LOCALES DE CREACIÓN
// ==========================================
function createWalkerLocal(user = 'Usuario') {
  const x = Math.random() > 0.5 ? 0 : state.canvas.width;
  const y = CONFIG.game.groundY - 64;
  createWalker(x, y, user);
}

function createDonationLocal(amount, user = 'Usuario', message = '') {
  const x = state.canvas.width / 2;
  const y = state.canvas.height / 2;
  createDonation(x, y, amount, user, message);
}

// ==========================================
// GAME LOOP
// ==========================================
function startGameLoop() {
  if (state.isRunning) return;
  
  state.isRunning = true;
  state.lastFrameTime = performance.now();
  
  function gameLoop(currentTime) {
    if (!state.isRunning) return;
    
    // Calcular deltaTime
    const deltaTime = (currentTime - state.lastFrameTime) / 1000;
    state.lastFrameTime = currentTime;
    
    // Actualizar
    update(deltaTime);
    
    // Renderizar
    render();
    
    // Actualizar FPS
    updateFPS(currentTime);
    
    // Continuar loop
    requestAnimationFrame(gameLoop);
  }
  
  requestAnimationFrame(gameLoop);
  console.log('🎬 Game loop iniciado');
}

function update(deltaTime) {
  // Actualizar walkers
  updateWalkers(state.ctx, deltaTime, CONFIG.game.groundY);
  
  // Actualizar donaciones
  updateDonations(state.ctx, deltaTime);
  
  // Actualizar objetos
  updateObjects(state.ctx);
}

function render() {
  const ctx = state.ctx;
  const canvas = state.canvas;
  
  // Limpiar canvas
  ctx.fillStyle = CONFIG.canvas.backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Dibujar suelo
  ctx.fillStyle = CONFIG.canvas.groundColor;
  ctx.fillRect(0, CONFIG.game.groundY, canvas.width, canvas.height - CONFIG.game.groundY);
  
  // Los objetos se dibujan en sus respectivos update()
}

// ==========================================
// MONITORING
// ==========================================
function updateFPS(currentTime) {
  state.frameCount++;
  
  if (currentTime - state.lastFpsUpdate >= 1000) {
    state.fps = state.frameCount;
    state.frameCount = 0;
    state.lastFpsUpdate = currentTime;
  }
}

function startMonitoring() {
  setInterval(() => {
    updateDebugPanel();
  }, 100); // Actualizar cada 100ms
}

function updateDebugPanel() {
  if (state.elements.fps) {
    state.elements.fps.textContent = state.fps;
  }
  
  if (state.elements.walkerCount) {
    state.elements.walkerCount.textContent = getWalkers().length;
  }
  
  if (state.elements.donationCount) {
    state.elements.donationCount.textContent = getDonations().length;
  }
  
  if (state.elements.objectCount) {
    state.elements.objectCount.textContent = getObjects().length;
  }
  
  if (state.elements.wsEventCount) {
    state.elements.wsEventCount.textContent = state.wsEventCount;
  }
  
  if (state.elements.connectionTime && state.connectionStartTime) {
    const seconds = Math.floor((Date.now() - state.connectionStartTime) / 1000);
    state.elements.connectionTime.textContent = `${seconds}s`;
  }
}

// ==========================================
// UI UTILITIES
// ==========================================
function setButtonLoading(buttonId, isLoading) {
  const button = state.elements[buttonId];
  if (!button) return;
  
  if (isLoading) {
    button.disabled = true;
    button.classList.add('loading');
  } else {
    button.disabled = false;
    button.classList.remove('loading');
  }
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Remover después de 3 segundos
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ==========================================
// EXPORTS
// ==========================================
export { state, CONFIG };

// ==========================================
// AUTO-INIT
// ==========================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}