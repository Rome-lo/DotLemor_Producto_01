// 📂 frontend/js/object.js

const objects = [];
const size = 20;

/**
 * Crea un nuevo objeto (por ejemplo, una “donación”) en una posición aleatoria.
 */
export function createObject(x = Math.random() * 700 + 50, y = 320) {
  objects.push({
    x,
    y,
    collected: false
  });
}

/**
 * Dibuja todos los objetos no recolectados.
 */
export function updateObjects(ctx) {
  ctx.fillStyle = 'gold';
  objects.forEach(obj => {
    if (!obj.collected) {
      ctx.beginPath();
      ctx.arc(obj.x, obj.y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/**
 * Detecta colisiones con caminantes y ejecuta un callback al colisionar.
 */
export function checkCollision(walker, callback) {
  objects.forEach(obj => {
    const dx = walker.x - obj.x;
    const dy = walker.y - obj.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 30 && !obj.collected) {
      obj.collected = true;
      callback(obj);
    }
  });
}
