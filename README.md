# 📱 Disparador WhatsApp

> Sistema fullstack de automação de mensagens WhatsApp com filas assíncronas persistentes, fluxos multi-etapa por contato e worker independente do navegador.

**Repositório:** https://github.com/MatheusMeirellesGomes/Disparador-Whatsapp

Desenvolvido como desafio técnico para a **[Devsider](https://devsider.com.br) — Systems · Cloud · Labs · AI**, Belo Horizonte.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Stack](#stack)
- [Funcionalidades](#funcionalidades)
- [Como Rodar](#como-rodar)
- [Conectando o WhatsApp](#conectando-o-whatsapp)
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

1. **Importar contatos** via CSV ou manualmente para listas separadas
2. **Criar campanhas** com mensagem e delay aleatório entre cada envio
3. **Criar fluxos automáticos** com sequência de mensagens e intervalos por contato
4. **Conectar o WhatsApp real** via QR Code (WPPConnect) ou usar modo mock para testes
5. **Monitorar** o status de cada envio em tempo real

Tudo isso com execução 100% assíncrona e persistente — o sistema continua funcionando mesmo com o navegador fechado.

---

## Arquitetura

```
┌──────────────────────────────────────────────────────────┐
│                   FRONTEND (React + Vite)                 │
│          React · TypeScript · CSS · React Router          │
│                    localhost:5173                         │
└───────────────────────┬──────────────────────────────────┘
                        │ HTTP (proxy Vite → :3000)
┌───────────────────────▼──────────────────────────────────┐
│                   API (Express + Node.js)                  │
│         TypeScript · Prisma ORM · JWT Auth · CORS         │
│                    localhost:3000                         │
│                                                           │
│   /auth   /contatos   /campanhas   /fluxos   /whatsapp   │
└───────────────────────┬──────────────────────────────────┘
                        │ compartilha o banco
┌───────────────────────▼──────────────────────────────────┐
│                      PostgreSQL                            │
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
| Banco de dados | PostgreSQL |
| Autenticação | JWT + bcryptjs |
| WhatsApp | WPPConnect 1.x (Mock configurável) |
| Frontend | React 18 · TypeScript · Vite |
| Estilização | CSS puro com variáveis (sem framework) |

---

## Funcionalidades

### 1. Autenticação
- Registro e login com email e senha
- Senha armazenada com hash bcrypt
- Token JWT com expiração de 7 dias
- Opção de entrar sem login (modo visitante)

### 2. Importação de Contatos
- Upload de arquivo `.csv` via interface web
- Adição manual de contatos (nome + telefone)
- Associação a listas nomeadas
- Visualização dos contatos por lista

### 3. Campanhas de Disparo
- Cria campanha com mensagem, delay mínimo e máximo (em segundos)
- Ao criar, popula a `fila_envio` com `scheduled_at` individual por contato com delay aleatório acumulado
- **O disparo nunca ocorre no controller** — o Worker processa a fila de forma assíncrona
- Validação: não permite criar campanha para lista sem contatos

### 4. Fluxos Automáticos ⭐
Sequência de mensagens com intervalos configuráveis por contato:

```
Etapa 1 → enviada imediatamente ao entrar no fluxo
Etapa 2 → após +N minutos da etapa 1
Etapa 3 → após +N minutos da etapa 2
```

- Cada contato executa o fluxo **de forma independente**
- O estado de cada execução fica salvo em `execucao_fluxo`
- O Worker avança a etapa e agenda a próxima com base no `next_execution_at`

### 5. Integração WhatsApp Real
- Conexão via QR Code usando WPPConnect
- Sessão persistida em disco (reconecta automaticamente)
- Verificação de número via `checkNumberStatus` antes de enviar (resolve LID)
- Worker verifica conexão antes de processar a fila
- Modo mock disponível para testes sem WhatsApp real

### 6. Worker Autônomo
- Processo separado que roda continuamente
- Polling a cada 5 segundos no banco
- Verifica conexão WhatsApp antes de processar
- Aguarda 15 segundos no startup para o WhatsApp inicializar
- Delay de 2 segundos entre envios para evitar bloqueios

---

## Como Rodar

### Pré-requisitos

- Node.js 18+
- PostgreSQL rodando localmente
- npm

### 1. Clone o repositório

```bash
git clone https://github.com/MatheusMeirellesGomes/Disparador-Whatsapp.git
cd Disparador-Whatsapp
```

### 2. Configure o backend

```bash
cd backend
npm install
cp .env.example .env
# Edite o .env com sua DATABASE_URL e configurações
```

Exemplo de `.env`:
```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/disparador"
PORT=3000
WHATSAPP_MOCK=false
JWT_SECRET=sua_chave_secreta_aqui
CORS_ORIGINS=http://localhost:5173
```

### 3. Crie o banco e rode as migrations

```bash
# Crie o banco (se não existir)
createdb disparador

# Rode as migrations
npx prisma migrate dev --name init

# Gere o client Prisma
npx prisma generate
```

### 4. Configure o frontend

```bash
cd ../frontend
npm install
```

### 5. Suba os 3 serviços em terminais separados

```bash
# Terminal 1 — API (backend)
cd backend
npm run dev
# Aguarde: [WhatsApp] QR Code gerado
# Escaneie o QR pelo frontend e aguarde: [WhatsApp] ✅ Conectado!

# Terminal 2 — Worker (só após WhatsApp conectar)
cd backend
npm run dev:worker

# Terminal 3 — Frontend
cd frontend
npm run dev
```

Acesse: **http://localhost:5173**

> **Dica:** Se a porta 3000 estiver ocupada, use:
> ```bash
> lsof -ti :3000 | xargs kill -9 2>/dev/null; npm run dev
> ```

---

## Conectando o WhatsApp

1. Suba o backend (`npm run dev`)
2. Acesse **http://localhost:5173** e vá na aba **WhatsApp**
3. Escaneie o QR Code com seu celular:
   - Abra o WhatsApp no celular
   - Toque em **Aparelhos Conectados → Conectar aparelho**
   - Aponte para o QR Code na tela
4. Aguarde `[WhatsApp] ✅ Conectado!` no terminal do backend
5. Só então suba o worker (`npm run dev:worker`)

> **Importante:** Se tiver sessões antigas, remova-as antes em WhatsApp → Aparelhos Conectados → remova todos.

---

## Formato do CSV

O arquivo deve ter exatamente essas duas colunas com cabeçalho:

```csv
nome,telefone
João Silva,5511999990001
Maria Souza,5521988880002
Pedro Lima,5531977770003
```

**Regras:**
- Cabeçalho obrigatório: `nome,telefone` (minúsculo)
- Telefone deve incluir DDI (55 para Brasil) + DDD + número
- Formato brasileiro: `55` + 2 dígitos DDD + 9 dígitos = 13 dígitos total
- Linhas com campos vazios são ignoradas automaticamente
- Salvar como `.csv` (encoding UTF-8)

**Arquivo de teste incluído:** `contatos_teste.csv` na raiz do projeto com 4 contatos de exemplo.

---

## Variáveis de Ambiente

### `backend/.env`

| Variável | Padrão | Descrição |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `PORT` | `3000` | Porta da API |
| `WHATSAPP_MOCK` | `true` | `false` = usa WPPConnect real com QR Code |
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

### Visualizar banco em tempo real

```bash
cd backend && npx prisma studio
# Acesse: http://localhost:5555
```

---

## API Reference

### Auth
```
POST /auth/register   { email, senha }
POST /auth/login      { email, senha }
```

### Contatos
```
POST   /contatos/listas                        → Cria lista
GET    /contatos/listas                        → Lista todas com contagem
POST   /contatos/listas/:id/importar           → Upload CSV (multipart/form-data)
POST   /contatos/listas/:id/contatos           → Adiciona contato manual
GET    /contatos/listas/:id/contatos           → Contatos da lista
DELETE /contatos/contatos/:id                  → Remove contato
DELETE /contatos/listas/:id                    → Remove lista e contatos
```

### Campanhas
```
POST   /campanhas   { nome, mensagem, delayMin, delayMax, listaId }
GET    /campanhas
GET    /campanhas/:id
DELETE /campanhas/:id
```

### Fluxos
```
POST   /fluxos              { nome, etapas: [{ mensagem, delayMinutos, ordem }] }
GET    /fluxos
DELETE /fluxos/:id
POST   /fluxos/:id/iniciar  { listaId }
GET    /fluxos/:id/execucoes
```

### WhatsApp
```
GET    /whatsapp/status   → { status: "conectado" | "aguardando_qr" | "desconectado" }
GET    /whatsapp/qr       → { qr: "base64..." | null, status, conectado }
POST   /whatsapp/iniciar  → Inicia sessão WPPConnect
POST   /whatsapp/enviar   { telefone, mensagem }
```

### Health
```
GET    /health   → { status: "ok" }
```

---

## Fluxo Assíncrono

### Como uma campanha é enviada

```
1. POST /campanhas
   └─ Valida campos e verifica se lista tem contatos
   └─ Cria registro em campanhas
   └─ Para cada contato:
       └─ delay = random(delayMin, delayMax)
       └─ scheduled_at = agora + delay acumulado
       └─ Insere em fila_envio com status "pendente"
   └─ Atualiza campanha → status "agendada"

2. Worker (a cada 5s):
   └─ Verifica se WhatsApp está conectado
   └─ Busca fila_envio WHERE status='pendente' AND scheduled_at <= now()
   └─ Para cada item:
       └─ status → "processando"
       └─ checkNumberStatus(telefone) → resolve ID real (LID)
       └─ sendText(id._serialized, mensagem)
       └─ status → "enviado" ou "erro"
       └─ Aguarda 2s antes do próximo
```

### Como um fluxo avança

```
1. POST /fluxos/:id/iniciar
   └─ Para cada contato da lista:
       └─ Cria execucao_fluxo com etapaAtual=0, nextExecutionAt=agora

2. Worker (a cada 5s):
   └─ Busca execucao_fluxo WHERE status='ativo' AND nextExecutionAt <= now()
   └─ Para cada execução:
       └─ Envia mensagem da etapa atual
       └─ Se tem próxima etapa:
           └─ nextExecutionAt = agora + delayMinutos da próxima etapa
           └─ etapaAtual += 1
       └─ Se última etapa: status → "concluido"
```

---

## Decisões Técnicas

### Por que polling no banco em vez de Redis/BullMQ?
PostgreSQL como única dependência de infraestrutura. Polling a cada 5s é suficiente para o volume proposto e elimina a necessidade de Redis, simplificando setup, deploy e manutenção.

### Por que o disparo não ocorre no controller?
Se o envio acontecesse dentro da requisição HTTP, qualquer queda de conexão ou timeout cancelaria o processo. Com a fila no banco + Worker separado, a requisição apenas agenda — o Worker executa de forma totalmente independente.

### Por que `scheduled_at` acumulado nas campanhas?
Cada contato recebe um `scheduled_at` individual com delay acumulado. Evita que todos sejam processados em rajada e simula comportamento humano — reduzindo risco de bloqueio pelo WhatsApp.

### Por que `checkNumberStatus` antes de enviar?
Contas novas do WhatsApp usam LID (Linked Device ID) em vez de IDs baseados em número de telefone. O `checkNumberStatus` resolve o `id._serialized` correto do destinatário, evitando o erro "No LID for user".

### Por que CSS puro sem framework?
Permite explicar cada decisão visual sem depender de conhecimento de uma biblioteca específica. Visual moderno com gradientes, sombras e variáveis CSS — sem dependências extras no bundle.

---

## Estrutura do Projeto

```
Disparador-Whatsapp/
├── contatos_teste.csv              # CSV de exemplo (4 contatos)
├── README.md
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma           # Models do banco
│   │   └── migrations/             # Histórico de migrations
│   ├── src/
│   │   ├── server.ts               # Express + rotas + inicialização WhatsApp
│   │   ├── worker.ts               # Worker autônomo (polling a cada 5s)
│   │   ├── routes/
│   │   │   ├── auth.ts             # Register / Login
│   │   │   ├── contatos.ts         # Listas + importação CSV
│   │   │   ├── campanhas.ts        # Criar campanha + popular fila
│   │   │   ├── fluxos.ts           # Criar fluxo + iniciar + execuções
│   │   │   └── whatsapp.ts         # Status + QR + enviar
│   │   └── services/
│   │       └── whatsapp/
│   │           ├── IWhatsAppClient.ts    # Interface
│   │           ├── MockWhatsAppClient.ts # Implementação mock
│   │           ├── WPPConnectClient.ts   # Implementação real (QR Code)
│   │           └── index.ts             # Singleton factory
│   ├── uploads/                    # CSVs temporários (auto-deletados)
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx                  # Roteamento + auth guard
    │   ├── styles.css               # CSS completo com variáveis
    │   ├── services/
    │   │   └── api.ts               # get / post / del / postForm
    │   └── pages/
    │       ├── Login.tsx            # Login + Registro + Visitante
    │       ├── Contatos.tsx         # Listas + CSV + manual
    │       ├── Campanhas.tsx        # Criar e listar campanhas
    │       ├── Fluxos.tsx           # Criar fluxo + execuções
    │       └── Whatsapp.tsx         # QR Code + status conexão
    ├── vite.config.ts               # Proxy → backend :3000
    └── package.json
```

---

## Modo Mock (testes sem WhatsApp)

Para testar sem precisar conectar o WhatsApp real:

```env
WHATSAPP_MOCK=true
```

No terminal do worker:
```
[Mock] Enviando para 5531999999999: Olá João, temos uma oferta...
[CAMPANHA] ✅ Enviado → 5531999999999
```

---

<div align="center">
  Desenvolvido para o desafio técnico da <strong>Devsider</strong> — Belo Horizonte 🚀<br/><br/>
  <a href="https://github.com/MatheusMeirellesGomes/Disparador-Whatsapp">
    github.com/MatheusMeirellesGomes/Disparador-Whatsapp
  </a>
</div>
