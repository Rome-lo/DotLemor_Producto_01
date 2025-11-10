// frontend/js/controls.js
/**
 * Configuración de controles y eventos de UI
 */

const cooldowns = new Map();

export function setupControls(onCreateWalker, onCreateDonation, onCustomDonation) {
  // Botón crear walker
  const btnWalker = document.getElementById('btnWalker');
  if (btnWalker) {
    btnWalker.addEventListener('click', () => {
      if (isOnCooldown('walker')) {
        console.warn('⏳ Walker en cooldown');
        return;
      }
      
      onCreateWalker();
      setCooldown('walker', 500); // 0.5 segundos
    });
  }

  // Botón donación aleatoria
  const btnDonation = document.getElementById('btnDonation');
  if (btnDonation) {
    btnDonation.addEventListener('click', () => {
      if (isOnCooldown('donation')) {
        console.warn('⏳ Donación en cooldown');
        return;
      }
      
      onCreateDonation();
      setCooldown('donation', 1000); // 1 segundo
    });
  }

  // Botón enviar donación personalizada
  const btnSendDonation = document.getElementById('btnSendDonation');
  const donationAmount = document.getElementById('donationAmount');
  const donationUser = document.getElementById('donationUser');
  const donationMessage = document.getElementById('donationMessage');
  
  if (btnSendDonation) {
    btnSendDonation.addEventListener('click', () => {
      if (isOnCooldown('customDonation')) {
        console.warn('⏳ Donación en cooldown');
        return;
      }
      
      const amount = donationAmount ? donationAmount.value : '';
      const user = donationUser ? donationUser.value : '';
      const message = donationMessage ? donationMessage.value : '';
      
      // Validaciones básicas
      if (!amount || parseFloat(amount) <= 0) {
        alert('Por favor ingresa un monto válido');
        return;
      }
      
      if (parseFloat(amount) > 10000) {
        alert('El monto máximo es $10,000');
        return;
      }
      
      onCustomDonation(amount, user, message);
      setCooldown('customDonation', 1000);
    });
  }

  // Enter key en inputs para enviar
  [donationAmount, donationUser, donationMessage].forEach(input => {
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          btnSendDonation.click();
        }
      });
    }
  });

  // Atajos de teclado
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + W: Crear walker
    if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
      e.preventDefault();
      if (!isOnCooldown('walker')) {
        onCreateWalker();
        setCooldown('walker', 500);
      }
    }
    
    // Ctrl/Cmd + D: Donación aleatoria
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      if (!isOnCooldown('donation')) {
        onCreateDonation();
        setCooldown('donation', 1000);
      }
    }
  });

  console.log('✅ Controles configurados');
  console.log('💡 Atajos: Ctrl+W (Walker), Ctrl+D (Donación)');
}

// Sistema de cooldown
function setCooldown(key, duration) {
  cooldowns.set(key, Date.now() + duration);
}

function isOnCooldown(key) {
  const cooldownEnd = cooldowns.get(key);
  if (!cooldownEnd) return false;
  
  if (Date.now() < cooldownEnd) {
    return true;
  }
  
  cooldowns.delete(key);
  return false;
}