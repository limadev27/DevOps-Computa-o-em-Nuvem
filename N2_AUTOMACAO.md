# N2 — Automação e reprodução do ambiente Nimbus com Ansible

## Objetivo

Reproduzir em **um servidor Ubuntu Linux novo** a aplicação Nimbus da N1, sem executar manualmente as etapas de instalação do Docker, clone do repositório e subida dos containers. O playbook utiliza o **mesmo repositório da N1** e o `docker-compose.yml` existente.

**Escopo de validação:** o compose versionado inclui `web` (Nginx, porta externa 8080) e `backend` (Node.js, API e SQLite persistido no volume `nimbus-data`). A documentação da N1 também descreve, na VPS de produção, Caddy, Uptime Kuma, Grafana e outras stacks. Como os respectivos arquivos Compose/configuração *não estão versionados neste repositório*, eles **não são reproduzidos por este playbook**. Se o professor exigir a infraestrutura completa da VPS e não apenas a implantação HTTP da aplicação, será preciso acrescentar os arquivos dessas stacks e suas automações.

## Pré-requisitos

- VM de destino limpa com **Ubuntu 22.04 LTS ou mais recente**, arquitetura AMD64 ou ARM64.
- A VM deve ter Python 3 instalado, saída para internet, conectividade SSH e um usuário com `sudo`.
- Computador de controle Linux ou Windows com **WSL/Ubuntu**, Ansible instalado, chave SSH autorizada na VM e acesso ao GitHub.
- A porta **8080/TCP** deve estar liberada no firewall do provedor para acesso externo. A automação não modifica regras remotas do provedor; não exponha desnecessariamente outras portas.
- Recursos suficientes para compilar duas imagens Docker. Recomenda-se pelo menos 2 GB de RAM, com mais memória se o build precisar.

## 1. Preparar o controlador (PC ou WSL Ubuntu)

```bash
sudo apt update
sudo apt install -y ansible git
ansible-galaxy collection install -r ansible/requirements.yml
```

## 2. Criar o inventário (sem publicar acesso SSH)

```bash
cp ansible/inventory.ini.example ansible/inventory.ini
```

Edite `ansible/inventory.ini` e substitua `203.0.113.10` pelo IP real **do servidor Linux de testes** e `ubuntu` pelo usuário com permissão `sudo`. **Não envie chaves privadas, senhas nem o inventário real para o GitHub.**

## 3. Testar conectividade

```bash
ansible -i ansible/inventory.ini nimbus -m ping --private-key ~/.ssh/id_ed25519
```

Esse comando verifica a conexão SSH e o Python remoto. Se seu provedor usar outra chave SSH, ajuste o caminho ou use `ssh-agent`.

## 4. Executar a automação

Na raiz do repositório da N1:

```bash
ansible-playbook -i ansible/inventory.ini ansible/site.yml --private-key ~/.ssh/id_ed25519
```

O Ansible vai:

1. Validar o Ubuntu e instalar dependências básicas.
2. Adicionar o repositório oficial do Docker e instalar **Docker Engine + Compose v2**.
3. Iniciar e habilitar o serviço Docker.
4. Gerar uma vez o `JWT_SECRET` e guardá-lo em `/opt/nimbus-n2/.env` no destino, com permissão `0600`.
5. Clonar o código da N1 em `/opt/nimbus-n2/app` (branch configurada em `group_vars/all.yml`).
6. Construir/iniciar a stack via Docker Compose, preservando o volume persistente do SQLite.
7. Testar `http://127.0.0.1:8080/` e `http://127.0.0.1:8080/api/health` (deve responder `{ "status": "ok" }`).

A configuração do segredo **não** é exibida nos logs da execução.

## 5. Verificar a implantação

Conectado à VM por SSH:

```bash
docker --version
docker compose version
docker ps
docker compose --env-file /opt/nimbus-n2/.env -f /opt/nimbus-n2/app/docker-compose.yml -p nimbus_n2 ps
curl -i http://127.0.0.1:8080/
curl -i http://127.0.0.1:8080/api/health
```

Do navegador no seu computador, acesse:

```text
http://IP_PUBLICO_DA_VM:8080
```

**Importante:** o IP `203.0.113.10` do inventário de exemplo **não é real**. Se a VM for gerenciada pelo professor ou pelo provedor, obtenha o IP, usuário, chave e regra de entrada da porta 8080 antes de executar.

## 6. Reprodutibilidade e reexecução

- Teste numa **VM nova**, não na VPS da N1. Não rode sem avaliar os efeitos numa máquina de produção.
- Uma segunda execução do playbook deve preservar `/opt/nimbus-n2/.env` e o volume do SQLite, atualizando apenas o que mudou no repositório ou nas imagens.
- Apresente o resumo final `PLAY RECAP`, a lista de containers `docker ps`, o HTTP 200 da página e o JSON da rota `/api/health`.
- Para simular uma falha controlada no laboratório, pare o container `nimbus-web`, execute o playbook novamente e confirme a recuperação. Evite fazer o teste na VPS de produção.

## 7. Problemas e diagnóstico

| Sintoma | Diagnóstico |
| --- | --- |
| SSH inacessível | Revisar IP, chave privada, usuário, porta 22 e regras do provedor. |
| `sudo` pede senha | Executar com `--ask-become-pass` se aplicável e autorizado. |
| Docker não instala | Conferir versão Ubuntu, conexão à internet, APT e chave/repositório do Docker. |
| Build falha | Conferir memória, disco, saída para o registry e logs do Compose. |
| Container cai | `docker ps -a` e `docker logs nimbus-backend` / `docker logs nimbus-web`. |
| Site não abre fora da VM | Conferir `docker ps`, porta 8080, firewall externo e regras locais. |
| `/api/health` falha | Verificar logs do backend e variável `JWT_SECRET` no arquivo privado da VM. |

## 8. Segurança e limites do teste HTTP

- Nunca publicar `.env`, token JWT, chave SSH ou credenciais no Git. O inventário real é ignorado por `ansible/.gitignore`.
- **A versão atual do backend configura cookies com `secure: true`.** Portanto, funcionalidades de login que dependem desses cookies **não funcionarão normalmente pelo HTTP simples**. O HTTP da N2 serve para validar a implantação e a rota pública de saúde. Para demonstrar login, configurar HTTPS com domínio/proxy, como na N1.
- O playbook não recria DNS, certificados, Uptime Kuma, Caddy, Grafana, Prometheus ou CrowdSec. Isso não consta como requisito explícito desta N2 resumida, mas deve ser alinhado ao escopo da apresentação se o professor pedir todas as stacks da N1.
- O primeiro playbook **instala componentes e executa containers no servidor informado**. Confira o inventário antes de executá-lo.

## 9. Evidências para a entrega

Salve capturas legíveis de: (1) repositório original atualizado com `ansible/`; (2) inventário de exemplo, variáveis e playbook; (3) `PLAY RECAP` com zero falhas; (4) `docker ps`; (5) acesso ao site por HTTP; (6) rota `/api/health` devolvendo `status: ok`; (7) reexecução em VM nova e, se possível, vídeo de demonstração. O professor deve poder clonar **o repositório original**, copiar o inventário e executar os comandos documentados.

## 10. Fluxo da arquitetura N2

```text
PC / WSL (Ansible)
       | SSH
       v
VM Ubuntu nova
  | instala Docker Engine + Compose
  | clona o GitHub original da N1
  | gera .env privado (JWT_SECRET)
  v
Docker Compose (nimbus_n2)
  ├── nimbus-web: Nginx       -> IP:8080
  ├── nimbus-backend: Node    -> acesso interno
  └── nimbus-data: volume SQLite persistente
       |
       v
HTTP 200 /          + HTTP 200 /api/health
```

**Terraform não é necessário**: a VM pode ser fornecida pelo professor.
