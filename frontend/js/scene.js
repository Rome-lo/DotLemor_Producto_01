import { updateWalkers } from './walker.js';
import { updateObjects } from './object.js';

let ctx = null;

/**
 * Inicializa el contexto del canvas para poder dibujar.
 */
export function initScene(canvasContext) {
  ctx = canvasContext;
}

/**
 * Refresca todo lo que se ve en pantalla.
 */
export function updateScene() {
  if (!ctx) return;

  // Limpia el lienzo
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Dibuja el fondo (si quieres un color base)
  ctx.fillStyle = '#eef';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Actualiza objetos y caminantes
  updateObjects(ctx);
  updateWalkers(ctx);
}
