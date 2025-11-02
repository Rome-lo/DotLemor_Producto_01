import { initScene, updateScene } from './scene.js';
import { setupControls } from './controls.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Inicializa la escena
initScene(ctx);

// Configura los botones de prueba (simular donaciones, etc.)
setupControls();

// Bucle principal de animación
function gameLoop() {
  updateScene();
  requestAnimationFrame(gameLoop);
}

gameLoop();
