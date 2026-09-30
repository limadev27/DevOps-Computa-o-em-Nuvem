// auth.js
// ------------------------------------------------------------
// Este mesmo arquivo é usado tanto no login.html quanto no
// cadastro.html. A tag <script> em cada página traz um atributo
// "data-mode" (login ou cadastro) dizendo qual rota chamar.
// ------------------------------------------------------------

const scriptAtual = document.currentScript;
const modo = scriptAtual.dataset.mode; // "login" ou "cadastro"

const rota = modo === 'login' ? '/api/login' : '/api/register';
const form = document.getElementById(modo === 'login' ? 'loginForm' : 'cadastroForm');
const messageEl = document.getElementById('message');
const submitBtn = document.getElementById('submitBtn');

// Se o usuário veio da página de planos, guardamos qual plano ele
// escolheu (?plano=pro) para confirmar depois do login/cadastro.
const plano = new URLSearchParams(window.location.search).get('plano');
const qs = plano ? '?plano=' + encodeURIComponent(plano) : '';
document.querySelectorAll('.auth-switch a').forEach((a) => { a.href += qs; });

form.addEventListener('submit', async (event) => {
  // Impede o comportamento padrão do formulário (que recarregaria a página).
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value;

  messageEl.textContent = '';
  messageEl.className = 'auth-message';
  submitBtn.disabled = true;
  submitBtn.textContent = modo === 'login' ? 'Entrando…' : 'Criando conta…';

  try {
    const resposta = await fetch(rota, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // "credentials: include" garante que o cookie de sessão
      // seja enviado/aceito mesmo com o navegador sendo rigoroso.
      credentials: 'include',
      body: JSON.stringify({ email, senha }),
    });

    // Lemos como texto primeiro: se o servidor devolver corpo vazio
    // (ex.: 502 do proxy), não quebramos com "Unexpected end of JSON".
    const texto = await resposta.text();
    let dados = {};
    try { dados = texto ? JSON.parse(texto) : {}; } catch (e) { /* corpo não-JSON */ }

    if (!resposta.ok) {
      throw new Error(dados.erro || `O servidor não respondeu direito (erro ${resposta.status}). Tente novamente em instantes.`);
    }

    // Deu certo: o backend já colocou o cookie de login.
    // Redirecionamos para a página de planos.
    window.location.href = 'planos.html' + qs;

  } catch (erro) {
    messageEl.textContent = erro.message;
    messageEl.classList.add('error');
    submitBtn.disabled = false;
    submitBtn.textContent = modo === 'login' ? 'Entrar' : 'Criar conta';
  }
});