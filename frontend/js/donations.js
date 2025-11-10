// frontend/js/donations.js
/**
 * Gestión de efectos visuales de donaciones
 */

const donations = [];

// Configuración de efectos según monto
const EFFECTS = {
  basic: { duration: 2000, particles: 10, size: 20, color: '#feca57' },
  special: { duration: 3000, particles: 20, size: 30, color: '#ff9ff3' },
  super: { duration: 4000, particles: 40, size: 40, color: '#54a0ff' },
  mega: { duration: 5000, particles: 60, size: 50, color: '#0be881' }
};

export function createDonation(x, y, amount, user = 'Usuario', message = '') {
  // Determinar tipo de efecto
  let effectType = 'basic';
  if (amount >= 100) effectType = 'mega';
  else if (amount >= 50) effectType = 'super';
  else if (amount >= 10) effectType = 'special';
  
  const effect = EFFECTS[effectType];
  
  const donation = {
    x,
    y,
    amount,
    user,
    message,
    effectType,
    startTime: Date.now(),
    duration: effect.duration,
    particles: createParticles(x, y, effect.particles, effect.color),
    completed: false,
    alpha: 1,
    scale: 0
  };
  
  donations.push(donation);
  console.log(`💰 Donación creada: $${amount} de ${user}`);
  
  return donation;
}

function createParticles(x, y, count, color) {
  const particles = [];
  
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const speed = Math.random() * 3 + 2;
    
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2, // Inicial hacia arriba
      life: 1,
      size: Math.random() * 6 + 3,
      color
    });
  }
  
  return particles;
}

export function updateDonations(ctx, delta) {
  const now = Date.now();
  
  for (let i = donations.length - 1; i >= 0; i--) {
    const donation = donations[i];
    const elapsed = now - donation.startTime;
    const progress = Math.min(elapsed / donation.duration, 1);
    
    if (progress >= 1) {
      donation.completed = true;
      donations.splice(i, 1);
      continue;
    }
    
    // Animación de escala (bounce in)
    if (donation.scale < 1) {
      donation.scale = Math.min(donation.scale + delta * 4, 1);
    }
    
    // Fade out al final
    if (progress > 0.7) {
      donation.alpha = 1 - ((progress - 0.7) / 0.3);
    }
    
    // Actualizar partículas
    donation.particles.forEach(p => {
      p.x += p.vx * (delta * 60);
      p.y += p.vy * (delta * 60);
      p.vy += 0.2; // Gravedad
      p.life = 1 - progress;
    });
    
    // Dibujar
    drawDonation(ctx, donation);
  }
}

function drawDonation(ctx, donation) {
  ctx.save();
  
  // Dibujar partículas
  donation.particles.forEach(p => {
    if (p.life > 0) {
      ctx.globalAlpha = p.life * donation.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  
  // Dibujar texto de donación
  ctx.globalAlpha = donation.alpha;
  ctx.translate(donation.x, donation.y);
  ctx.scale(donation.scale, donation.scale);
  
  // Fondo del texto
  const effect = EFFECTS[donation.effectType];
  ctx.fillStyle = effect.color;
  ctx.shadowColor = effect.color;
  ctx.shadowBlur = 20;
  
  // Texto principal (monto)
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`$${donation.amount}`, 0, 0);
  
  // Usuario
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = 'white';
  ctx.shadowBlur = 10;
  ctx.fillText(donation.user, 0, -40);
  
  // Mensaje (si existe)
  if (donation.message) {
    ctx.font = '16px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(donation.message, 0, 40);
  }
  
  ctx.restore();
}

export function getDonations() {
  return donations;
}

export function clearDonations() {
  donations.length = 0;
}