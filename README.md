# 📱 Disparador WhatsApp

> Sistema fullstack de automação de mensagens WhatsApp com filas assíncronas persistentes, fluxos multi-etapa por contato e worker independente do navegador.

Desenvolvido como desafio técnico para a **[Devsider](https://devsider.com.br) — Systems · Cloud · Labs · AI**, Belo Horizonte.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Stack](#stack)
- [Funcionalidades](#funcionalidades)
- [Como Rodar](#como-rodar)
- [Formato do CSV](#formato-do-csv)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Banco de Dados](#banco-de-dados)
- [API Reference](#api-reference)
- [Fluxo Assíncrono](#fluxo-assíncrono)
- [Decisões Técnicas](#decisões-técnicas)
- [Estrutura do Projeto](#estrutura-do-projeto)

---

## Visão Geral

O sistema permite:

1. **Importar contatos** via CSV para listas separadas
2. **Criar campanhas** com mensagem e delay aleatório entre cada envio
3. **Criar fluxos automáticos** com sequência de mensagens e intervalos por contato
4. **Monitorar** o status de cada envio em tempo real

Tudo isso com execução 100% assíncrona e persistente — o sistema continua funcionando mesmo com o navegador fechado.

---

## Arquitetura

```
┌──────────────────────────────────────────────────────────┐
│                   FRONTEND (React + Vite)                 │
│          React · TypeScript · CSS · React Router          │
└───────────────────────┬──────────────────────────────────┘
                        │ HTTP (proxy Vite → :3000)
┌───────────────────────▼──────────────────────────────────┐
│                   API (Express + Node.js)                  │
│         TypeScript · Prisma ORM · JWT Auth · CORS         │
│                                                           │
│   /auth      /contatos      /campanhas      /fluxos       │
└───────────────────────┬──────────────────────────────────┘
                        │ compartilha o banco
┌───────────────────────▼──────────────────────────────────┐
│                      PostgreSQL 16                         │
│  usuarios · listas · contatos · campanhas · fila_envio   │
│  fluxos · fluxo_etapas · execucao_fluxo                  │
└───────────────────────┬──────────────────────────────────┘
                        │ polling a cada 5s
┌───────────────────────▼──────────────────────────────────┐
│              WORKER (processo separado)                    │
│   Verifica fila_envio e execucao_fluxo continuamente      │
│   Envia via WPPConnect (ou Mock) · Atualiza status no DB  │
└──────────────────────────────────────────────────────────┘
```

**O Worker roda como processo completamente separado da API.**
Um crash no Worker não derruba a API. Os agendamentos sobrevivem reinicializações porque ficam persistidos no banco PostgreSQL — não na memória.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Backend API | Node.js · TypeScript · Express |
| ORM | Prisma |
| Banco de dados | PostgreSQL 16 |
| Autenticação | JWT + bcryptjs |
| WhatsApp | WPPConnect (Mock configurável) |
| Frontend | React 18 · TypeScript · Vite |
| Estilização | CSS puro com variáveis (sem framework) |
| Containerização | Docker + Docker Compose |

---

## Funcionalidades

### 1. Autenticação
- Registro e login com email e senha
- Senha armazenada com hash bcrypt
- Token JWT com expiração de 7 dias
- Opção de entrar sem login (modo visitante)

### 2. Importação de Contatos
- Upload de arquivo `.csv` via interface web
- Associação a listas nomeadas
- Visualização dos contatos importados por lista

### 3. Campanhas de Disparo
- Cria campanha com mensagem, delay mínimo e máximo (em segundos)
- Ao criar, popula a `fila_envio` com `scheduled_at` calculado individualmente para cada contato com delay aleatório acumulado
- **O disparo nunca ocorre no controller** — o Worker processa a fila de forma assíncrona

### 4. Fluxos Automáticos ⭐
Sequência de mensagens com intervalos configuráveis:

```
Etapa 1 → enviada imediatamente ao entrar no fluxo
Etapa 2 → após +N minutos da etapa 1
Etapa 3 → após +N minutos da etapa 2
```

- Cada contato executa o fluxo **de forma independente**
- O estado de cada execução fica salvo em `execucao_fluxo`
- O Worker avança a etapa e agenda a próxima com base no `next_execution_at`

### 5. Worker Autônomo
- Processo separado que roda continuamente
- Polling a cada 5 segundos no banco
- Verifica `fila_envio` e `execucao_fluxo` com `scheduled_at/next_execution_at ≤ agora`
- **Funciona com o navegador fechado**

---

## Como Rodar

### Pré-requisitos

- Node.js 18+
- PostgreSQL rodando localmente (ou via Docker)
- npm

### 1. Clone e configure

```bash
git clone <url-do-repositorio>
cd Disparador-Whatsapp
```

### 2. Configure o backend

```bash
cd backend
npm install
cp .env.example .env
# Edite o .env com sua DATABASE_URL e JWT_SECRET
```

### 3. Crie o banco e rode as migrations

```bash
# Crie o banco (se não existir)
createdb disparador

# Rode as migrations
npx prisma migrate dev --name init
```

### 4. Suba os serviços (3 terminais)

```bash
# Terminal 1 — API
cd backend
npm run dev

# Terminal 2 — Worker
cd backend
npm run dev:worker

# Terminal 3 — Frontend
cd frontend
npm install
npm run dev
```

Acesse: **http://localhost:5173**

### Com Docker (banco de dados)

Se preferir rodar o PostgreSQL via Docker:

```bash
docker compose up -d db
```

---

## Formato do CSV

O arquivo deve ter exatamente essas duas colunas com cabeçalho:

```csv
nome,telefone
João Silva,11999990001
Maria Souza,11988880002
Pedro Lima,21977770003
```

- O cabeçalho `nome,telefone` é obrigatório
- Telefone deve conter DDD + número (8 ou 9 dígitos)
- Linhas com campos vazios são ignoradas

---

## Variáveis de Ambiente

### `backend/.env`

| Variável | Padrão | Descrição |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `PORT` | `3000` | Porta da API |
| `WHATSAPP_MOCK` | `true` | `true` = simula envios sem WhatsApp real |
| `JWT_SECRET` | — | Chave para assinar os tokens JWT |
| `CORS_ORIGINS` | `http://localhost:5173` | Origens permitidas (separar por vírgula) |

---

## Banco de Dados

```
usuarios         → contas de acesso ao sistema
listas           → agrupamento de contatos
contatos         → nome + telefone, vinculado a uma lista
campanhas        → mensagem + delays + lista alvo
fila_envio       → 1 linha por contato/campanha com scheduled_at e status
fluxos           → definição do fluxo (nome)
fluxo_etapas     → etapas do fluxo (mensagem + delay + ordem)
execucao_fluxo   → estado de cada contato dentro de um fluxo
```

### Status da `fila_envio`

| Status | Descrição |
|---|---|
| `pendente` | Aguardando o scheduled_at chegar |
| `processando` | Worker está enviando agora |
| `enviado` | Mensagem enviada com sucesso |
| `erro` | Falha no envio |

### Status da `execucao_fluxo`

| Status | Descrição |
|---|---|
| `ativo` | Fluxo em andamento, aguardando próxima etapa |
| `concluido` | Todas as etapas foram enviadas |
| `erro` | Falha em alguma etapa |

---

## API Reference

### Auth
```
POST /auth/register   { email, senha }         → { token, email }
POST /auth/login      { email, senha }         → { token, email }
```

### Contatos
```
POST   /contatos/listas                        → Cria lista
GET    /contatos/listas                        → Lista todas
POST   /contatos/listas/:id/importar           → Upload CSV (multipart)
GET    /contatos/listas/:id/contatos           → Contatos da lista
```

### Campanhas
```
POST   /campanhas     { nome, mensagem, delayMin, delayMax, listaId }
GET    /campanhas
GET    /campanhas/:id
```

### Fluxos
```
POST   /fluxos        { nome, etapas: [{ mensagem, delayMinutos, ordem }] }
GET    /fluxos
POST   /fluxos/:id/iniciar   { listaId }
GET    /fluxos/:id/execucoes
```

### Health
```
GET    /health        → { status: "ok", timestamp }
```

---

## Fluxo Assíncrono

### Como uma campanha é enviada

```
1. POST /campanhas
   └─ Cria registro na tabela campanhas
   └─ Busca todos os contatos da lista
   └─ Para cada contato:
       └─ Calcula scheduled_at = agora + delay acumulado aleatório
       └─ Insere na fila_envio com status "pendente"

2. Worker (a cada 5s):
   └─ SELECT fila_envio WHERE status='pendente' AND scheduled_at <= now()
   └─ Para cada item:
       └─ Atualiza status → "processando"
       └─ Chama enviarMensagem(telefone, mensagem)
       └─ Atualiza status → "enviado" (ou "erro")
```

### Como um fluxo avança

```
1. POST /fluxos/:id/iniciar
   └─ Para cada contato da lista:
       └─ Cria execucao_fluxo com etapaAtual=0 e nextExecutionAt=agora

2. Worker (a cada 5s):
   └─ SELECT execucao_fluxo WHERE status='ativo' AND nextExecutionAt <= now()
   └─ Para cada execução:
       └─ Envia mensagem da etapa atual
       └─ Se tem próxima etapa:
           └─ nextExecutionAt = agora + delayMinutos da próxima etapa
           └─ etapaAtual += 1
       └─ Se última etapa:
           └─ status → "concluido"
```

---

## Decisões Técnicas

### Por que polling no banco em vez de Redis/BullMQ?

O sistema usa PostgreSQL como única dependência de infraestrutura. Polling a cada 5s é suficiente para o volume proposto e elimina a necessidade de Redis, simplificando o setup, o deploy e a explicação da arquitetura.

### Por que o disparo não pode estar no controller?

Se o envio acontecesse dentro da requisição HTTP, qualquer queda de conexão ou timeout do cliente cancelaria o processo no meio do envio. Com a fila no banco + Worker separado, a requisição apenas agenda — o Worker executa de forma totalmente independente.

### Por que `scheduled_at` acumulado nas campanhas?

Ao criar a campanha, cada contato recebe um `scheduled_at` individual já calculado com delay acumulado. Isso evita que todos os contatos sejam marcados como "pendentes" ao mesmo tempo e sejam processados em rajada pelo Worker — simulando o comportamento humano de envio com intervalos.

### Por que CSS puro sem framework?

Permite explicar cada decisão visual sem depender do conhecimento de uma biblioteca específica. O visual moderno foi alcançado com gradientes, sombras, variáveis CSS e a fonte Inter — sem nenhuma dependência extra no bundle.

### Por que JWT no localStorage?

Simplicidade para o escopo do desafio. Em produção o ideal seria `httpOnly cookie` para mitigar XSS. O token tem expiração de 7 dias e é removido no logout.

---

## Estrutura do Projeto

```
Disparador-Whatsapp/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Models do banco
│   │   └── migrations/            # Histórico de migrations
│   ├── src/
│   │   ├── server.ts              # Express + rotas + CORS
│   │   ├── worker.ts              # Worker autônomo (polling)
│   │   ├── routes/
│   │   │   ├── auth.ts            # Register / Login
│   │   │   ├── contatos.ts        # Listas + importação CSV
│   │   │   ├── campanhas.ts       # Criar campanha + fila
│   │   │   └── fluxos.ts          # Criar fluxo + iniciar
│   │   └── services/
│   │       └── whatsapp.ts        # Mock / WPPConnect
│   ├── uploads/                   # CSVs temporários (auto-deletados)
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── devsider-logo.svg      # Logo da Devsider
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                # Roteamento + auth guard
│   │   ├── styles.css             # CSS completo
│   │   ├── services/
│   │   │   └── api.ts             # get / post / postForm
│   │   └── pages/
│   │       ├── Login.tsx          # Login + Registro + Visitante
│   │       ├── Contatos.tsx       # Listas + CSV
│   │       ├── Campanhas.tsx      # Criar campanha
│   │       └── Fluxos.tsx         # Criar fluxo + execuções
│   ├── vite.config.ts             # Proxy → backend :3000
│   └── package.json
├── docker-compose.yml             # PostgreSQL + serviços
└── README.md
```

---

## Modo Mock

Por padrão o sistema roda em modo mock — nenhuma mensagem real é enviada.

```bash
WHATSAPP_MOCK=true   # simula envios com log no terminal
WHATSAPP_MOCK=false  # usa WPPConnect (requer autenticação via QR Code)
```

No terminal do worker você verá:

```
[MOCK] Enviando para 11999990001: Olá João, temos uma oferta...
[CAMPANHA] Enviado para 11999990001
[FLUXO] Etapa 1 enviada para 11988880002
```

---

<div align="center">
  Desenvolvido para o desafio técnico da <strong>Devsider</strong> — Belo Horizonte 🚀
</div>
