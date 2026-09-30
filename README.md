# EVANS Platform

Plataforma web privada de atendimento: **1 administrador ↔ muitos clientes**, conversando em tempo real.

Não é rede social: clientes conversam exclusivamente com o admin, nunca entre si.

## Stack

| Camada    | Tecnologia |
|-----------|------------|
| Frontend  | React 18 + Vite, Tailwind CSS, Framer Motion, Three.js (hero 3D) |
| Backend   | Node.js + Express (API REST + WebSocket no mesmo processo) |
| Banco     | PostgreSQL (Render Postgres ou Supabase Postgres — ambos via `DATABASE_URL`) |
| Tempo real| WebSocket (`ws`) com reconexão automática no cliente |
| Auth      | Sessão em cookie HttpOnly + Argon2id para senhas |
| Upload    | Multer + Sharp (valida MIME real, converte para WebP, limite 5MB) |
| Validação | Zod em todas as entradas da API |

## Estrutura
