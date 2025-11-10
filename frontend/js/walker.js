// frontend/js/walker.js
/**
 * Gestión de caminantes (walkers)
 * Corregido para usar el sprite sheet human.png correctamente
 */

const walkers = [];
const sprite = new Image();
sprite.src = './assets/walkers/human.png';

// Verificar carga del sprite
sprite.onload = () => {
  console.log('✅ Sprite human.png cargado:', sprite.width, 'x', sprite.height);
};

sprite.onerror = () => {
  console.error('❌ Error al cargar sprite human.png');
};

// Configuración del sprite sheet
// NOTA: Calculado desde la imagen real (512x512, 8 columnas x 8 filas)
const SPRITE_CONFIG = {
  frameWidth: 110,    // 512 / 8 = 64px por frame
  frameHeight: 128,   // 512 / 8 = 64px por frame
  
  // Animaciones (row = fila en el sprite sheet)
  animations: {
    walk: {
      row: 1,        // Fila 2 (índice 1) = caminar normal
      frames: 4,     // 8 frames de animación
      speed: 0.15    // Velocidad de animación
    },
    jump: {
      row: 0,        // Fila 1 (índice 0) = salto
      frame: 4,      // Frame del salto (ajustar según visual)
    }
  }
};

// Configuración del comportamiento
const BEHAVIOR_CONFIG = {
  baseSpeed: 2.5,
  speedVariation: 1,
  jumpHeight: 50,
  jumpDuration: 20,
  jumpsAtEdge: 2     // Número de saltos al llegar al borde
};

export function createWalker(x, y, user = 'Usuario') {
  // Determinar posición y dirección inicial
  let startX, direction;
  
  console.log(`🎯 createWalker llamado con x=${x}, y=${y}, user=${user}`);
  
  if (x === undefined || x < 400) {
    startX = -SPRITE_CONFIG.frameWidth;  // Empezar fuera de la izquierda
    direction = 1;  // Ir hacia la derecha
  } else {
    startX = 900 + SPRITE_CONFIG.frameWidth;  // Empezar fuera de la derecha
    direction = -1; // Ir hacia la izquierda
  }
  
  console.log(`📍 Posición calculada: startX=${startX}, direction=${direction}`);
  
  const walker = {
    x: startX,
    y: y || 372, // Posición Y por defecto (436 - 64 = 372)
    direction,
    
    // Animación
    currentAnimation: 'walk',
    frame: 0,
    animationSpeed: SPRITE_CONFIG.animations.walk.speed,
    
    // Movimiento
    speed: BEHAVIOR_CONFIG.baseSpeed + (Math.random() * BEHAVIOR_CONFIG.speedVariation),
    
    // Salto
    jumping: false,
    jumpFrame: 0,
    jumpsRemaining: 0,
    jumpCooldown: 0,
    
    // Info
    user,
    id: Date.now() + Math.random(),
    createdAt: Date.now()
  };
  
  walkers.push(walker);
  console.log(`✅ Walker creado exitosamente:`, walker);
  console.log(`📊 Total walkers activos: ${walkers.length}`);
  
  return walker;
}

export function updateWalkers(ctx, delta, groundY = 420) {
  const canvasWidth = ctx.canvas.width;
  
  for (let i = walkers.length - 1; i >= 0; i--) {
    const walker = walkers[i];
    
    // === MOVIMIENTO HORIZONTAL ===
    if (!walker.jumping || walker.jumpCooldown > 0) {
      walker.x += walker.speed * walker.direction * (delta * 60);
    }
    
    // === DETECCIÓN DE BORDES ===
    const reachedLeftEdge = walker.x <= 0 && walker.direction === -1;
    const reachedRightEdge = walker.x >= canvasWidth - SPRITE_CONFIG.frameWidth && walker.direction === 1;
    
    if ((reachedLeftEdge || reachedRightEdge) && !walker.jumping && walker.jumpCooldown === 0) {
      // Iniciar secuencia de saltos
      walker.jumpsRemaining = BEHAVIOR_CONFIG.jumpsAtEdge;
      walker.jumping = true;
      walker.jumpFrame = 0;
      console.log(`🔄 Walker ${walker.user} llegó al borde, iniciando ${walker.jumpsRemaining} saltos`);
    }
    
    // === LÓGICA DE SALTO ===
    if (walker.jumping) {
      walker.jumpFrame++;
      
      // Terminar salto actual
      if (walker.jumpFrame > BEHAVIOR_CONFIG.jumpDuration) {
        walker.jumping = false;
        walker.jumpFrame = 0;
        walker.jumpsRemaining--;
        
        // Si quedan saltos, hacer otro después de un pequeño delay
        if (walker.jumpsRemaining > 0) {
          walker.jumpCooldown = 5; // Frames de espera entre saltos
        } else {
          // Todos los saltos completados, cambiar dirección
          walker.direction *= -1;
          console.log(`↔️ Walker ${walker.user} cambió dirección a ${walker.direction}`);
        }
      }
    }
    
    // Cooldown entre saltos
    if (walker.jumpCooldown > 0) {
      walker.jumpCooldown--;
      if (walker.jumpCooldown === 0 && walker.jumpsRemaining > 0) {
        walker.jumping = true;
        walker.jumpFrame = 0;
      }
    }
    
    // === ANIMACIÓN DE FRAMES ===
    if (!walker.jumping) {
      walker.frame += walker.animationSpeed;
      if (walker.frame >= SPRITE_CONFIG.animations.walk.frames) {
        walker.frame = 0;
      }
    }
    
    // === DIBUJAR ===
    drawWalker(ctx, walker, groundY);
    
    // === LIMPIEZA ===
    // Eliminar walkers muy fuera de pantalla (después de 5 segundos)
    const lifetime = Date.now() - walker.createdAt;
    const isFarOutside = walker.x < -200 || walker.x > canvasWidth + 200;
    if (lifetime > 60000 || isFarOutside) { // 60 segundos máximo
      walkers.splice(i, 1);
      console.log(`🗑️ Walker ${walker.user} eliminado`);
    }
  }
}

function drawWalker(ctx, walker, groundY) {
  if (!sprite.complete || sprite.naturalHeight === 0) {
    // Sprite no cargado, dibujar placeholder VISIBLE
    console.warn(`⚠️ Sprite no cargado, dibujando placeholder en (${walker.x}, ${walker.y})`);
    ctx.fillStyle = 'red';
    ctx.fillRect(walker.x, walker.y, SPRITE_CONFIG.frameWidth, SPRITE_CONFIG.frameHeight);
    
    // Dibujar texto de debug
    ctx.fillStyle = 'white';
    ctx.font = '12px monospace';
    ctx.fillText('LOADING...', walker.x, walker.y - 5);
    return;
  }
  
  // Log ocasional para debug (cada 60 frames)
  if (Math.random() < 0.016) { // ~1 vez por segundo a 60fps
    console.log(`🎨 Dibujando walker en x=${Math.floor(walker.x)}, y=${Math.floor(walker.y)}`);
  }
  
  // Calcular posición Y (con salto)
  let drawY = walker.y;
  if (walker.jumping) {
    const progress = walker.jumpFrame / BEHAVIOR_CONFIG.jumpDuration;
    const jumpOffset = Math.sin(progress * Math.PI) * BEHAVIOR_CONFIG.jumpHeight;
    drawY = walker.y - jumpOffset;
  }
  
  // Determinar qué frame dibujar
  let sourceX, sourceY;
  
  if (walker.jumping) {
    // Frame de salto
    sourceX = SPRITE_CONFIG.animations.jump.frame * SPRITE_CONFIG.frameWidth;
    sourceY = SPRITE_CONFIG.animations.jump.row * SPRITE_CONFIG.frameHeight;
  } else {
    // Frame de caminar
    const frameIndex = Math.floor(walker.frame);
    sourceX = frameIndex * SPRITE_CONFIG.frameWidth;
    sourceY = SPRITE_CONFIG.animations.walk.row * SPRITE_CONFIG.frameHeight;
  }
  
  ctx.save();
  
  // Flip horizontal según dirección
  if (walker.direction === -1) {
    ctx.translate(walker.x + SPRITE_CONFIG.frameWidth, drawY);
    ctx.scale(-1, 1);
    ctx.drawImage(
      sprite,
      sourceX, sourceY,
      SPRITE_CONFIG.frameWidth, SPRITE_CONFIG.frameHeight,
      0, 0,
      SPRITE_CONFIG.frameWidth, SPRITE_CONFIG.frameHeight
    );
  } else {
    ctx.drawImage(
      sprite,
      sourceX, sourceY,
      SPRITE_CONFIG.frameWidth, SPRITE_CONFIG.frameHeight,
      walker.x, drawY,
      SPRITE_CONFIG.frameWidth, SPRITE_CONFIG.frameHeight
    );
  }
  
  ctx.restore();
  
  // Dibujar nombre del usuario
  if (walker.user) {
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    
    const textX = walker.x + SPRITE_CONFIG.frameWidth / 2;
    const textY = drawY - 5;
    
    ctx.strokeText(walker.user, textX, textY);
    ctx.fillText(walker.user, textX, textY);
    ctx.restore();
  }
}

export function getWalkers() {
  return walkers;
}

export function clearWalkers() {
  walkers.length = 0;
  console.log('🗑️ Todos los walkers eliminados');
}

// Función de debug para verificar sprite
export function debugSprite() {
  console.log('🔍 Debug del sprite:');
  console.log('  - Cargado:', sprite.complete);
  console.log('  - Dimensiones:', sprite.width, 'x', sprite.height);
  console.log('  - Frames por fila:', sprite.width / SPRITE_CONFIG.frameWidth);
  console.log('  - Número de filas:', sprite.height / SPRITE_CONFIG.frameHeight);
  console.log('  - Walkers activos:', walkers.length);
}

// Exportar para usar en consola
window.debugWalkers = debugSprite;