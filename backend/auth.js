// auth.js
// ------------------------------------------------------------
// Aqui vive tudo relacionado a "provar quem é o usuário".
//
// A ideia do JWT (JSON Web Token) é simples: depois que o usuário
// faz login, a gente gera um "crachá" assinado digitalmente, com o
// id dele dentro. Esse crachá vai guardado num cookie no navegador
// do usuário. A cada requisição, o navegador manda o cookie de
// volta, e a gente confere se a assinatura é válida.
//
// Ninguém consegue forjar um crachá sem saber o JWT_SECRET, que só
// o servidor conhece.
// ------------------------------------------------------------

const jwt = require('jsonwebtoken');

// O "segredo" usado pra assinar os crachás. Em produção, ele vem de
// uma variável de ambiente (definida no docker-compose.yml / .env),
// nunca escrito direto no código.
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  // Se esquecermos de configurar o segredo, é melhor o servidor
  // recusar a ligar do que rodar de forma insegura.
  throw new Error('JWT_SECRET não foi definido. Configure a variável de ambiente.');
}

const COOKIE_NAME = 'nimbus_token';

// Gera um crachá (token) pra um usuário específico.
// Ele expira em 7 dias — depois disso, a pessoa precisa logar de novo.
function gerarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, email: usuario.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Coloca o crachá num cookie "httpOnly": isso significa que o
// JavaScript do navegador NÃO consegue ler esse cookie (só o
// próprio navegador manda ele de volta pro servidor). Isso protege
// contra um tipo comum de ataque (roubo de cookie via script malicioso).
function enviarCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,       // só trafega por HTTPS (seu site já usa Caddy + HTTPS)
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias, em milissegundos
  });
}

function limparCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

// Middleware: uma função que roda ANTES da rota de verdade.
// Se o cookie for válido, ela guarda o usuário em "req.usuario" e
// deixa a requisição seguir. Se não for válido, corta o acesso.
function exigirLogin(req, res, next) {
  const token = req.cookies[COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ erro: 'Você precisa estar logado.' });
  }

  try {
    const dados = jwt.verify(token, JWT_SECRET);
    req.usuario = dados; // { id, email }
    next(); // segue pra rota de verdade
  } catch (erro) {
    return res.status(401).json({ erro: 'Sessão inválida ou expirada.' });
  }
}

module.exports = { gerarToken, enviarCookie, limparCookie, exigirLogin, COOKIE_NAME };
