// fx.js — efeitos visuais compartilhados por login, cadastro e planos.
// (brilho do cursor, mostrar/ocultar senha, força da senha, spotlight nos cards)
const glow = document.getElementById('cursorGlow');
let mx = innerWidth / 2, my = innerHeight / 2, gx = mx, gy = my;
addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });
(function loop() {
  gx += (mx - gx) * 0.12; gy += (my - gy) * 0.12;
  if (glow) glow.style.transform = `translate(${gx}px,${gy}px) translate(-50%,-50%)`;
  requestAnimationFrame(loop);
})();

document.querySelectorAll('.pw-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    const input = btn.parentElement.querySelector('input');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.classList.toggle('on', show);
    btn.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
  });
});

const strength = document.getElementById('strength');
if (strength) {
  const label = document.getElementById('strengthLabel');
  const nomes = ['Use letras, números e símbolos.', 'Fraca', 'Razoável', 'Boa', 'Forte'];
  document.getElementById('senha').addEventListener('input', (e) => {
    const v = e.target.value;
    let n = 0;
    if (v.length >= 6) n++;
    if (v.length >= 10) n++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) n++;
    if (/\d/.test(v) && /[^A-Za-z0-9]/.test(v)) n++;
    if (!v) n = 0;
    strength.dataset.level = n;
    label.textContent = nomes[n];
  });
}

// spotlight que segue o mouse dentro de cada card de plano
document.addEventListener('mousemove', (e) => {
  const card = e.target.closest && e.target.closest('.plan-card');
  if (!card) return;
  const r = card.getBoundingClientRect();
  card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
  card.style.setProperty('--my', (e.clientY - r.top) + 'px');
});
