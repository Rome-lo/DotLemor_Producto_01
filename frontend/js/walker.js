const walkers = [];
const sprite = new Image();
sprite.src = './assets/walkers/human.png';

export function createWalker(x = 50, y = 300) {
  walkers.push({
    x,
    y,
    direction: 1,
    frame: 0,
    frameCount: 8,
    frameWidth: 64,
    frameHeight: 64,
    speed: 1.5,
    jumping: false,
    jumpFrame: 0
  });
}

export function updateWalkers(ctx, delta) {
  walkers.forEach(walker => {
    // Movimiento
    walker.x += walker.speed * walker.direction;

    // Verificar límites
    if (walker.x < 0 || walker.x > ctx.canvas.width - walker.frameWidth) {
      walker.direction *= -1;
      walker.jumping = true;
      walker.jumpFrame = 0;
    }

    // Animación de salto
    if (walker.jumping) {
      const jumpY = Math.sin((walker.jumpFrame / 20) * Math.PI) * 20;
      ctx.drawImage(
        sprite,
        Math.floor(walker.frame) * walker.frameWidth,
        0,
        walker.frameWidth,
        walker.frameHeight,
        walker.x,
        walker.y - jumpY,
        walker.frameWidth,
        walker.frameHeight
      );
      walker.jumpFrame++;
      if (walker.jumpFrame > 40) walker.jumping = false;
    } else {
      // Animación caminando
      ctx.drawImage(
        sprite,
        Math.floor(walker.frame) * walker.frameWidth,
        0,
        walker.frameWidth,
        walker.frameHeight,
        walker.x,
        walker.y,
        walker.frameWidth,
        walker.frameHeight
      );
      walker.frame += 0.1;
      if (walker.frame >= walker.frameCount) walker.frame = 0;
    }
  });
}
