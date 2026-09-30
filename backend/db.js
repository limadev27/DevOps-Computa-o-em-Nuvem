// db.js
// ------------------------------------------------------------
// Este arquivo é responsável por UMA coisa só: conversar com o banco
// de dados (um arquivo SQLite). Nenhuma outra parte do projeto mexe
// direto no arquivo do banco — todo mundo passa por aqui.
//
// SQLite é um banco de dados que mora dentro de um único arquivo
// (nesse caso, "data/nimbus.db"). Não precisa instalar um servidor
// de banco separado, o que é perfeito pra estudar e pra projetos
// pequenos.
// ------------------------------------------------------------

const path = require('path');
const Database = require('better-sqlite3');

// __dirname = pasta onde este arquivo está.
// Vamos guardar o banco dentro de /app/data dentro do container,
// que vai ser um "volume" do Docker (assim os dados não somem
// quando o container reiniciar).
const dbPath = path.join(__dirname, 'data', 'nimbus.db');
const db = new Database(dbPath);

// "PRAGMA" são configurações internas do SQLite.
// Isso aqui deixa leitura/escrita mais seguras quando várias
// requisições chegam ao mesmo tempo.
db.pragma('journal_mode = WAL');

// Cria as tabelas SE elas ainda não existirem.
// Isso roda toda vez que o servidor liga, mas como já existe,
// o "IF NOT EXISTS" impede que apague os dados.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subscribers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migração: adiciona a coluna "plan" (plano escolhido) se ainda não existir.
// Assim o banco antigo continua funcionando sem apagar nada.
const colunas = db.prepare('PRAGMA table_info(users)').all();
if (!colunas.some((c) => c.name === 'plan')) {
  db.exec('ALTER TABLE users ADD COLUMN plan TEXT');
}

// Exportamos "db" pra outros arquivos poderem usar,
// e também algumas "consultas prontas" (statements),
// que são mais rápidas quando reaproveitadas.
module.exports = {
  db,

  // ---- usuários ----
  findUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  insertUser: db.prepare(
    'INSERT INTO users (email, password_hash) VALUES (?, ?)'
  ),
  setUserPlan: db.prepare('UPDATE users SET plan = ? WHERE id = ?'),
  findUserById: db.prepare('SELECT id, email, plan, created_at FROM users WHERE id = ?'),

  // ---- e-mails capturados no formulário ----
  insertSubscriber: db.prepare(
    'INSERT OR IGNORE INTO subscribers (email) VALUES (?)'
  ),
};