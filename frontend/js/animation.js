// animation.js
export function animate(ctx, walkers, objects, groundY) {
  const canvas = ctx.canvas;

  function loop() {
    // limpiar
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // suelo
    ctx.fillStyle = "#333";
    ctx.fillRect(0, groundY + 8, canvas.width, 6);

    // dibujar objetos
    for (const obj of objects) obj.draw(ctx);

    // actualizar caminantes y chequear colisiones
    for (const w of walkers) {
      w.update(canvas, groundY);
      // colisiones
      for (const obj of objects) {
        if (!obj.collected && obj.checkCollision(w)) {
          obj.collected = true;
          w.startJump(2); // doble salto en el mismo lugar
          spawnFloatingText(ctx, "¡Interacción!", w.x, w.y - 60);
        }
      }
      w.draw(ctx);
    }

    // limpiar objetos recogidos (opcional)
    for (let i = objects.length - 1; i >= 0; i--) {
      if (objects[i].collected) objects.splice(i, 1);
    }

    requestAnimationFrame(loop);
  }

  loop();
}

function spawnFloatingText(ctx, text, x, y) {
  // simple texto que sube y se desvanece
  let alpha = 1.0;
  let posY = y;
  function frame() {
    if (alpha <= 0) return;
    ctx.font = "20px sans-serif";
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.textAlign = "center";
    ctx.fillText(text, x, posY);
    alpha -= 0.02;
    posY -= 0.8;
    requestAnimationFrame(frame);
  }
  frame();
}
