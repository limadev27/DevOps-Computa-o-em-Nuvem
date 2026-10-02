// server.js
// ------------------------------------------------------------
// Este é o "ponto de entrada" do backend: onde o servidor liga e
// onde ficam as rotas (os "endereços" que o front-end vai chamar).
//
// Fluxo geral de uma requisição:
//   navegador → Caddy (proxy/HTTPS) → este servidor → banco de dados
// ------------------------------------------------------------

const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');

const db = require('./db');
const { gerarToken, enviarCookie, limparCookie, exigirLogin } = require('./auth');

const app = express();
const PORTA = process.env.PORT || 3000;

// ---- middlewares globais ----
// express.json() faz o servidor entender corpos de requisição em JSON
// (é assim que o front-end vai mandar e-mail/senha).
app.use(express.json());
// cookieParser() lê os cookies que o navegador manda e os transforma
// num objeto fácil de usar: req.cookies.
app.use(cookieParser());

// Rota simples pra confirmar que o backend está de pé.
// Útil pro Uptime Kuma monitorar, por exemplo.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ------------------------------------------------------------
// CADASTRO
// ------------------------------------------------------------
app.post('/api/register', async (req, res) => {
  const { email, senha } = req.body || {};

  // Validação bem básica. Sempre desconfie do que vem do front-end:
  // qualquer pessoa pode chamar essa rota diretamente, sem passar
  // pelo seu formulário.
  if (!email || !senha) {
    return res.status(400).json({ erro: 'Informe email e senha.' });
  }
  if (senha.length < 6) {
    return res.status(400).json({ erro: 'A senha precisa ter pelo menos 6 caracteres.' });
  }

  const existente = db.findUserByEmail.get(email);
  if (existente) {
    return res.status(409).json({ erro: 'Já existe uma conta com esse email.' });
  }

  // NUNCA guardamos a senha em texto puro. "hash" transforma a senha
  // num texto embaralhado sem volta (não dá pra converter de volta
  // pra senha original). Ao logar, comparamos hash com hash.
  const hash = await bcrypt.hash(senha, 10);

  const resultado = db.insertUser.run(email, hash);
  const usuario = { id: resultado.lastInsertRowid, email };

  const token = gerarToken(usuario);
  enviarCookie(res, token);

  res.status(201).json({ email: usuario.email });
});

// ------------------------------------------------------------
// LOGIN
// ------------------------------------------------------------
app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'Informe email e senha.' });
  }

  const usuario = db.findUserByEmail.get(email);
  if (!usuario) {
    // De propósito, a mensagem não diz "email não encontrado".
    // Isso evita que alguém descubra quais emails têm conta só
    // tentando logar.
    return res.status(401).json({ erro: 'Email ou senha incorretos.' });
  }

  const senhaCorreta = await bcrypt.compare(senha, usuario.password_hash);
  if (!senhaCorreta) {
    return res.status(401).json({ erro: 'Email ou senha incorretos.' });
  }

  const token = gerarToken(usuario);
  enviarCookie(res, token);

  res.json({ email: usuario.email });
});

// ------------------------------------------------------------
// LOGOUT
// ------------------------------------------------------------
app.post('/api/logout', (req, res) => {
  limparCookie(res);
  res.json({ ok: true });
});

// ------------------------------------------------------------
// "QUEM SOU EU" — o front-end chama isso pra saber se o visitante
// está logado antes de mostrar a página de planos.
// ------------------------------------------------------------
app.get('/api/me', exigirLogin, (req, res) => {
  const usuario = db.findUserById.get(req.usuario.id);
  res.json({ email: usuario.email, plano: usuario.plan });
});

// ------------------------------------------------------------
// PLANOS — públicos para ver; login só ao escolher.
// ------------------------------------------------------------
const PLANOS = [
    {
      id: 'starter',
      nome: 'Starter',
      preco: 'Grátis',
      descricao: 'Para testar a orquestração em projetos pequenos.',
      recursos: ['Até 5 containers', '1 região', 'Suporte via comunidade'],
    },
    {
      id: 'pro',
      nome: 'Pro',
      preco: 'R$ 149/mês',
      descricao: 'Para times que já rodam em produção.',
      recursos: ['Até 200 containers', '5 regiões', 'Auto-scaling', 'Suporte prioritário'],
    },
    {
      id: 'enterprise',
      nome: 'Enterprise',
      preco: 'Sob consulta',
      descricao: 'Para operações de grande escala, multi-nuvem.',
      recursos: ['Containers ilimitados', 'Todas as regiões', 'Zero-trust dedicado', 'Gerente de conta'],
    },
];

// Lista de planos: PÚBLICA. Qualquer visitante pode ver os planos;
// o login só é exigido na hora de ESCOLHER um plano.
app.get('/api/plans', (req, res) => {
  res.json(PLANOS);
});

// Escolher plano: aqui sim exige login (exigirLogin).
app.post('/api/choose-plan', exigirLogin, (req, res) => {
  const { plano } = req.body || {};
  if (!PLANOS.some((p) => p.id === plano)) {
    return res.status(400).json({ erro: 'Plano inválido.' });
  }
  db.setUserPlan.run(plano, req.usuario.id);
  res.json({ plano });
});

// ------------------------------------------------------------
// FORMULÁRIO "DEIXE SEU EMAIL" — não exige login, é público.
// ------------------------------------------------------------
app.post('/api/subscribe', (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ erro: 'Informe um email válido.' });
  }

  db.insertSubscriber.run(email);
  res.status(201).json({ ok: true });
});

app.listen(PORTA, () => {
  console.log(`Backend do Nimbus rodando na porta ${PORTA}`);
});

app.get('/api/metrics', (req, res) => {
  const range = req.query.range; // "1h", "6h" ou "24h"
  // Troque isto pela consulta real que fizer sentido pro seu projeto
  // (ex.: contar usuários/assinantes por hora no banco).
  // O formato de resposta tem que ser exatamente este:
  res.json({
    times: ['10:00', '10:30', '11:00'],
    vals: {
      prod: [60, 65, 70],
      stag: [40, 38, 42],
      dev:  [20, 22, 19],
    },
  });
});