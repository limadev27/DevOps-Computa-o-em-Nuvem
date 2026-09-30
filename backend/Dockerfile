# Imagem oficial do Node, versão "slim" (mais leve).
FROM node:20-slim

WORKDIR /app

# Copiamos só o package.json primeiro. Assim, se você mudar o código
# mas não as dependências, o Docker reaproveita essa camada e o
# build fica bem mais rápido.
COPY package.json ./
RUN npm install --omit=dev

# Agora sim copiamos o resto do código.
COPY . .

# Pasta onde o SQLite vai guardar o arquivo do banco.
# O docker-compose vai "montar" um volume aqui por fora,
# pra os dados sobreviverem a reinícios do container.
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "server.js"]
