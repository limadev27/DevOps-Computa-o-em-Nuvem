// planos.js
// ------------------------------------------------------------
// A lista de planos é PÚBLICA: qualquer visitante pode ver.
// O login só é pedido quando a pessoa clica em "Escolher plano".
// Quem garante a segurança de verdade é o backend: a rota
// /api/choose-plan exige o cookie de login.
// ------------------------------------------------------------

const welcomeMsg = document.getElementById('welcomeMsg');
const plansGrid = document.getElementById('plansGrid');
const logoutBtn = document.getElementById('logoutBtn');
const loginLink = document.getElementById('loginLink');
const planMsg = document.getElementById('planMsg');

let usuario = null; // null = visitante (não logado)

async function lerJson(resposta) {
  const texto = await resposta.text();
  try { return texto ? JSON.parse(texto) : {}; } catch (e) { return {}; }
}

function mostrarMensagem(texto, tipo) {
  planMsg.textContent = texto;
  planMsg.className = 'auth-message ' + tipo;
}

function atualizarBotoes() {
  plansGrid.querySelectorAll('[data-plano]').forEach((btn) => {
    const atual = usuario && usuario.plano === btn.dataset.plano;
    btn.disabled = !!atual;
    btn.textContent = atual ? 'Seu plano atual' : 'Escolher plano';
  });
}

async function escolherPlano(id) {
  // Visitante: só agora pedimos login/cadastro, lembrando qual plano foi escolhido.
  if (!usuario) {
    window.location.href = 'login.html?plano=' + encodeURIComponent(id);
    return;
  }
  try {
    const resposta = await fetch('/api/choose-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ plano: id }),
    });
    const dados = await lerJson(resposta);
    if (!resposta.ok) throw new Error(dados.erro || `Erro ${resposta.status}. Tente novamente.`);
    usuario.plano = id;
    atualizarBotoes();
    mostrarMensagem('Plano selecionado com sucesso!', 'success');
  } catch (erro) {
    mostrarMensagem(erro.message, 'error');
  }
}

async function carregarPagina() {
  // 1. Planos (públicos).
  try {
    const resposta = await fetch('/api/plans');
    const planos = await resposta.json();
    const icones = ['◇', '◈', '◎'];
    plansGrid.innerHTML = planos.map((plano, indice) => {
      // "R$ 149/mês" vira valor + período; "Grátis" fica só com o valor.
      const [valor, periodo] = String(plano.preco).split('/');
      const destaque = indice === 1;
      return `
      <article class="plan-card ${destaque ? 'featured' : ''}">
        <div class="plan-top">
          <span class="plan-icon" aria-hidden="true">${icones[indice % icones.length]}</span>
          ${destaque ? '<span class="plan-badge">Mais popular</span>' : ''}
        </div>
        <h3 class="plan-name">${plano.nome}</h3>
        <div class="plan-price">
          <span class="plan-price-value">${valor}</span>
          ${periodo ? `<span class="plan-price-period">/${periodo}</span>` : ''}
        </div>
        <p class="plan-desc">${plano.descricao}</p>
        <ul class="plan-features">
          ${plano.recursos.map((r) => `<li>${r}</li>`).join('')}
        </ul>
        <button type="button" class="auth-submit plan-choose ${destaque ? '' : 'ghost'}" data-plano="${plano.id}">Escolher plano</button>
      </article>`;
    }).join('');
  } catch (e) {
    mostrarMensagem('Não foi possível carregar os planos agora.', 'error');
    return;
  }

  plansGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-plano]');
    if (btn) escolherPlano(btn.dataset.plano);
  });

  // 2. Descobre se há alguém logado (sem forçar login).
  try {
    const resposta = await fetch('/api/me', { credentials: 'include' });
    if (resposta.ok) usuario = await resposta.json();
  } catch (e) { /* segue como visitante */ }

  if (usuario) {
    welcomeMsg.textContent = `Logado como ${usuario.email}`;
    logoutBtn.hidden = false;
  } else {
    loginLink.hidden = false;
  }
  atualizarBotoes();

  // 3. Voltou do login/cadastro com um plano escolhido? Conclui a escolha.
  const planoUrl = new URLSearchParams(window.location.search).get('plano');
  if (planoUrl && usuario) {
    window.history.replaceState({}, '', 'planos.html');
    escolherPlano(planoUrl);
  }
}

logoutBtn.addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST', credentials: 'include' });
  window.location.href = 'planos.html';
});

carregarPagina();