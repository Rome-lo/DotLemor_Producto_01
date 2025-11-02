export function setupControls(createWalker, createObject) {
  const walkerBtn = document.getElementById('btnWalker');
  const donationBtn = document.getElementById('btnDonation');

  walkerBtn.addEventListener('click', async () => {
    try {
      await fetch('http://localhost:8080/simulate_walker', { method: 'POST' });
      createWalker();
    } catch (err) {
      console.error('❌ Error creando caminante:', err);
    }
  });

  donationBtn.addEventListener('click', async () => {
    try {
      await fetch('http://localhost:8080/simulate_donation', { method: 'POST' });
      createObject();
    } catch (err) {
      console.error('❌ Error donación:', err);
    }
  });
}
