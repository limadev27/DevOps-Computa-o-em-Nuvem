// ============ cursor glow ============
const cursorGlow = document.getElementById('cursorGlow');
let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
let glowX = mouseX, glowY = mouseY;

window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

function animateGlow(){
  glowX += (mouseX - glowX) * 0.12;
  glowY += (mouseY - glowY) * 0.12;
  if (cursorGlow) cursorGlow.style.transform = `translate(${glowX}px, ${glowY}px) translate(-50%, -50%)`;
  requestAnimationFrame(animateGlow);
}
animateGlow();

// ============ nav blur on scroll ============
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 24);
}, { passive: true });

// ============ smooth anchor scroll ============
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ============ scroll reveal ============
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.18 });
revealEls.forEach(el => revealObserver.observe(el));

// ============ animated counters ============
const counters = document.querySelectorAll('.stat-number');
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const isDecimal = target % 1 !== 0;
    const duration = 1600;
    const start = performance.now();

    function tick(now){
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;
      el.textContent = (isDecimal ? value.toFixed(2) : Math.round(value)) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    counterObserver.unobserve(el);
  });
}, { threshold: 0.6 });
counters.forEach(el => counterObserver.observe(el));

// ============ feature card tilt ============
document.querySelectorAll('[data-tilt]').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(600px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateZ(0)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(600px) rotateX(0) rotateY(0)';
  });
});

// ============ flow progress line ============
const flowLine = document.getElementById('flowLine');
const flowWrap = document.querySelector('.flow-line-wrap');
if (flowLine && flowWrap) {
  window.addEventListener('scroll', () => {
    const rect = flowWrap.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const start = viewportH * 0.85;
    const total = rect.height + viewportH * 0.3;
    const progressed = start - rect.top;
    const pct = Math.max(0, Math.min(1, progressed / total));
    flowLine.style.height = (pct * 100) + '%';
  }, { passive: true });
}

// ============ terminal typing effect ============
const typedEl = document.getElementById('typedLine');
const outputs = document.querySelectorAll('.terminal .out');
outputs.forEach(o => o.style.animationPlayState = 'paused');

const command = 'docker run -d --name nimbus-app -p 8080:80 nimbus/app:latest';
let typeIndex = 0;
let hasTyped = false;

function typeCommand(){
  if (hasTyped || !typedEl) return;
  hasTyped = true;
  const interval = setInterval(() => {
    typedEl.textContent = command.slice(0, typeIndex + 1);
    typeIndex++;
    if (typeIndex >= command.length) {
      clearInterval(interval);
      outputs.forEach((o, i) => {
        setTimeout(() => { o.style.animationPlayState = 'running'; }, 300 + i * 500);
      });
    }
  }, 32);
}

const terminalObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      typeCommand();
      terminalObserver.disconnect();
    }
  });
}, { threshold: 0.5 });
const terminalEl = document.querySelector('.terminal');
if (terminalEl) terminalObserver.observe(terminalEl);

// ============ captura de email (newsletter) ============
const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('newsletterEmail').value.trim();
    const msg = document.getElementById('newsletterMsg');

    try {
      const resposta = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      const texto = await resposta.text();
      let dados = {};
      try { dados = texto ? JSON.parse(texto) : {}; } catch (e) {}
      if (!resposta.ok) throw new Error(dados.erro || `Servidor indisponível (erro ${resposta.status}).`);
      msg.textContent = 'Email cadastrado! Obrigado.';
      msg.className = 'auth-message success';
      newsletterForm.reset();
    } catch (erro) {
      msg.textContent = erro.message;
      msg.className = 'auth-message error';
    }
  });
}

// ============ "Já é cliente?" — login direto na página inicial ============
const clientForm = document.getElementById('clientLoginForm');
const clientCard = document.getElementById('clientCard');
if (clientForm) {
  const clientMsg = document.getElementById('clientMsg');
  const clientSubmit = document.getElementById('clientSubmit');

  clientForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clientMsg.textContent = '';
    clientMsg.className = 'auth-message';
    clientSubmit.disabled = true;
    clientSubmit.textContent = 'Entrando…';
    try {
      const resposta = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: document.getElementById('clientEmail').value.trim(),
          senha: document.getElementById('clientSenha').value,
        }),
      });
      const texto = await resposta.text();
      let dados = {};
      try { dados = texto ? JSON.parse(texto) : {}; } catch (e) {}
      if (!resposta.ok) throw new Error(dados.erro || `Servidor indisponível (erro ${resposta.status}).`);
      window.location.href = 'planos.html';
    } catch (erro) {
      clientMsg.textContent = erro.message;
      clientMsg.classList.add('error');
      clientSubmit.disabled = false;
      clientSubmit.textContent = 'Entrar';
    }
  });

  // Se a pessoa já está logada, troca o formulário por um atalho.
  fetch('/api/me', { credentials: 'include' })
    .then((r) => (r.ok ? r.json() : null))
    .then((u) => {
      if (!u) return;
      clientCard.innerHTML = `
        <h3 style="font-size:20px;font-weight:700;text-align:center">Olá de novo!</h3>
        <p class="auth-sub" style="margin-top:8px;text-align:center;color:var(--text-muted);font-size:14px"></p>
        <a href="planos.html" class="auth-submit" style="display:block;margin-top:24px;text-align:center;text-decoration:none">Ir para os planos</a>`;
      clientCard.querySelector('.auth-sub').textContent = `Você está logado como ${u.email}.`;
    })
    .catch(() => {});
}