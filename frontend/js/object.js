// frontend/js/object.js
/**
 * Gestión de objetos coleccionables
 */

const objects = [];
const MAX_OBJECTS = 50;

const CONFIG = {
  size: 20,
  glowSpeed: 0.05,
  bobSpeed: 0.03,
  bobHeight: 10
};

export function createObject(x, y) {
  // Si no se especifican coordenadas, usar aleatorias
  if (x === undefined) {
    x = Math.random() * 800 + 50;
  }
  if (y === undefined) {
    y = Math.random() * 300 + 100;
  }
  
  // Limitar número de objetos
  if (objects.length >= MAX_OBJECTS) {
    objects.shift(); // Remover el más antiguo
  }
  
  const obj = {
    x,
    y,
    baseY: y, // Para animación de flotación
    collected: false,
    glow: 0,
    bob: 0,
    id: Date.now() + Math.random()
  };
  
  objects.push(obj);
  console.log(`⭐ Objeto creado en (${x}, ${y})`);
  
  return obj;
}

export function updateObjects(ctx) {
  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i];
    
    if (obj.collected) {
      objects.splice(i, 1);
      continue;
    }
    
    // Animación de brillo (pulsante)
    obj.glow += CONFIG.glowSpeed;
    const glowIntensity = Math.sin(obj.glow) * 0.5 + 0.5;
    
    // Animación de flotación (bobbing)
    obj.bob += CONFIG.bobSpeed;
    const bobOffset = Math.sin(obj.bob) * CONFIG.bobHeight;
    const currentY = obj.baseY + bobOffset;
    
    // Dibujar objeto
    ctx.save();
    
    // Glow effect
    ctx.shadowColor = 'rgba(254, 202, 87, ' + glowIntensity + ')';
    ctx.shadowBlur = 20 + (glowIntensity * 10);
    
    // Círculo principal
    ctx.fillStyle = `rgba(254, 202, 87, ${0.8 + glowIntensity * 0.2})`;
    ctx.beginPath();
    ctx.arc(obj.x, currentY, CONFIG.size / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Círculo interno (highlight)
    ctx.fillStyle = `rgba(255, 255, 255, ${0.6 + glowIntensity * 0.4})`;
    ctx.beginPath();
    ctx.arc(
      obj.x - CONFIG.size / 6,
      currentY - CONFIG.size / 6,
      CONFIG.size / 4,
      0,
      Math.PI * 2
    );
    ctx.fill();
    
    // Símbolo de moneda
    ctx.fillStyle = '#2d3436';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
    ctx.fillText('$', obj.x, currentY);
    
    ctx.restore();
  }
}

export function checkCollision(walker, callback) {
  objects.forEach(obj => {
    if (obj.collected) return;
    
    const dx = walker.x + 32 - obj.x; // +32 para centro del walker
    const dy = walker.y + 32 - obj.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < CONFIG.size + 20) { // Radio de colisión
      obj.collected = true;
      callback(obj);
    }
  });
}

export function getObjects() {
  return objects;
}

export function clearObjects() {
  objects.length = 0;
}