# EVANS Platform

Plataforma web privada de atendimento: **1 administrador ↔ muitos clientes**, com chat em tempo real.
Nao e rede social: clientes conversam exclusivamente com o admin, nunca entre si.

## Stack

| Camada    | Tecnologia |
|-----------|------------|
| Frontend  | React 18 + Vite, Tailwind CSS, Framer Motion, Three.js (hero 3D com fallback) |
| Backend   | Node.js + Express (API REST + WebSocket no mesmo processo) |
| Banco     | PostgreSQL (Render Postgres ou Supabase Postgres — ambos via `DATABASE_URL`) |
| Tempo real| WebSocket (`ws`) com reconexao automatica no cliente |
| Auth      | Sessao em cookie HttpOnly + Argon2id para senhas |
| Upload    | Multer + Sharp (valida MIME real, converte para WebP, limite 5MB) |
| Validacao | Zod em todas as entradas da API |

## Estrutura

```
evans-platform/
├── server/                  # backend Express
│   └── src/
│       ├── index.js         # entrypoint: HTTP + WS + static do frontend
│       ├── config.js        # variaveis de ambiente
│       ├── db.js            # pool pg + migracoes automaticas
│       ├── auth.js          # hash Argon2, sessoes, middlewares
│       ├── repo.js          # consultas ao banco
│       ├── realtime.js      # hub WebSocket por usuario
│       ├── rateLimit.js     # rate limit em memoria
│       ├── validate.js      # middleware Zod
│       ├── seed.js          # cria o admin na 1a execucao
│       ├── migrations/001_init.sql
│       └── routes/          # auth, chat, media, admin
├── client/                  # frontend React
│   └── src/
│       ├── pages/           # Landing, Login, Register, ClientHome, Admin
│       ├── components/      # Hero3D, ScrollVideo, ChatWindow, Navbar
│       └── ...              # auth context, ws client, api client
└── render.yaml              # deploy no Render em 1 servico
```

## Fluxo de autenticacao

```
POST /api/auth/register  -> valida (Zod) -> checa duplicidade -> Argon2 hash
                          -> cria usuario + conversa com o admin -> sessao -> cookie HttpOnly
POST /api/auth/login     -> rate limit -> busca usuario -> Argon2.verify
                          -> sessao no Postgres -> cookie HttpOnly (Secure em producao)
GET  /api/auth/me        -> retorna usuario da sessao
```

- A senha **nunca** e armazenada em texto nem retornada pela API.
- Cookie `HttpOnly`, `SameSite=Lax`, `Secure` em producao, expiracao configuravel (`SESSION_DAYS`).

## Modelo do banco

```
users(id, name, password_hash, role[ADMIN|CLIENT], status[active|blocked], timestamps)
sessions(id, user_id, token_hash, expires_at)
conversations(id, customer_id, admin_id)          -- UNIQUE(customer_id, admin_id)
messages(id, conversation_id, sender_id, content, message_type, attachment_url, read_at)
media(id, user_id, file_url, file_type, file_size)
audit_logs(id, user_id, action, metadata)
```

As migracoes rodam automaticamente na inicializacao (tabela `_migrations`).

## Regra fundamental do chat

O servidor **sempre** determina remetente/destinatario. O frontend nunca envia `recipient_id`:
- Cliente enviando -> remetente = cliente autenticado, destinatario = admin unico.
- Admin enviando -> remetente = admin, destinatario = dono da conversa selecionada.
- Cliente so acessa conversa onde `customer_id = seu id` (checked no backend).

## Realtime

- Cliente abre `wss://<host>/ws` (cookie de sessao autentica o upgrade).
- Servidor mapeia `userId -> sockets` e emite `message:new` / `conversation:read`
  para os dois lados da conversa.
- Cliente reconecta com backoff exponencial e atualiza o historico via REST.

## Midia (seu video e imagens)

Coloque seus arquivos em **`client/public/media/`**:

| Arquivo | Uso |
|---------|-----|
| `hero.mp4` | Video cinematografico do hero / scroll story (se ausente, usa animacao 3D) |
| `poster.jpg` | Capa do video enquanto carrega |
| `galeria-1.jpg` … `galeria-6.jpg` | Galeria |

Otimizacao sugerida:
```bash
ffmpeg -i original.mp4 -an -vcodec libx264 -crf 28 -preset slow -movflags +faststart client/public/media/hero.mp4
```

## Rodando local

Requisitos: Node 18+, um PostgreSQL (ou container).

```bash
# 1. configure o backend
cp .env.example server/.env   # ou use variaveis de ambiente
# edite DATABASE_URL no server/.env

# 2. instale tudo
npm run install:all

# 3. rode backend + frontend (2 terminais)
npm run dev:server   # http://localhost:4000
npm run dev:client   # http://localhost:5173 (proxy para o backend)
```

No primeiro start o servidor cria as tabelas e o administrador.

## Acesso do administrador

| Campo | Valor |
|-------|-------|
| Nome  | `admin` (ou `ADMIN_NAME` do .env) |
| Senha | `evans@xz` (ou `ADMIN_PASSWORD` do .env) |

Em producao, defina `ADMIN_PASSWORD` como variavel de ambiente no painel do Render.

## Deploy no Render (passo a passo)

1. **Suba o codigo no GitHub** (`git init && git add . && git commit && git push`).
2. No Render: **New → PostgreSQL** → copie a *Internal Database URL*.
3. **New → Web Service** → conecte o repositorio.
   O `render.yaml` preenche quase tudo; configure as variaveis:
   - `DATABASE_URL` = internal database URL do Postgres
   - `PGSSL` = `true`
   - `ADMIN_PASSWORD` = sua senha de admin
4. Deploy. Pronto: frontend + backend + WS no mesmo servico.

> Uploads ficam em disco efemero no plano free. Para persistir, adicione um
> Disk no Render montado em `/var/data` e defina `UPLOADS_DIR=/var/data/uploads`,
> ou migre depois para Supabase Storage (a API de media ja e isolada para isso).

## Variaveis de ambiente

Veja `.env.example`. Nenhum segredo e commitado.

## Seguranca implementada (sem exagero)

- Argon2id para senhas, sessao em cookie HttpOnly + Secure em producao
- Rate limit em memoria (login 8/min, register 10/min, mensagens 30/min, upload 12/min)
- Validacao Zod de todo body; queries 100% parametrizadas (pg)
- Autorizacao no backend em cada rota de conversa (cliente nunca cruza dados de outro)
- Helmet com CSP, sem exposicao de stack trace/SQL/segredos nos erros
- Upload: validacao de MIME real + resize + conversao WebP

## Notas

- `npm run dev:client` usa proxy do Vite para `/api`, `/uploads` e `/ws`.
- O 3D do hero desliga sozinho com `prefers-reduced-motion` ou sem WebGL.
- O video da landing sincroniza o playback com o scroll (0%→0s … 100%→fim).
