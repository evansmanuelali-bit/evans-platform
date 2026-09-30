import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { config } from './config.js';
import { pool, migrate } from './db.js';
import { seedAdmin } from './seed.js';
import { attachUser } from './auth.js';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import mediaRoutes from './routes/media.js';
import adminRoutes from './routes/admin.js';
import { setupRealtime } from './realtime.js';

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        mediaSrc: ["'self'", 'blob:'],
        connectSrc: ["'self'", 'ws:', 'wss:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(express.json({ limit: '256kb' }));
app.use(cookieParser());
app.use(attachUser);

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.use('/api/auth', authRoutes);
app.use('/api', chatRoutes);
app.use('/api', mediaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Rota nao encontrada' }));

fs.mkdirSync(config.uploadsDir, { recursive: true });
app.use('/uploads', express.static(config.uploadsDir, { maxAge: '7d' }));

if (fs.existsSync(config.clientDist)) {
  app.use(
    express.static(config.clientDist, {
      setHeaders(res, filePath) {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=86400');
        }
      },
    })
  );
  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/ws') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/media')
    ) {
      return next();
    }
    res.sendFile(path.join(config.clientDist, 'index.html'));
  });
}

// Tratamento centralizado de erros: nunca vazar stack trace, SQL ou segredos.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: `Arquivo excede o limite de ${config.maxUploadMb}MB` });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(400).json({ error: 'Requisicao muito grande' });
  }
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON invalido' });
  }
  console.error('[erro]', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

const server = http.createServer(app);
setupRealtime(server);

async function main() {
  if (!config.databaseUrl) {
    console.error('DATABASE_URL nao definida. Copie .env.example para .env e preencha.');
    process.exit(1);
  }
  await migrate();
  await seedAdmin();
  server.listen(config.port, () => {
    console.log(`Servidor rodando na porta ${config.port}`);
  });
}

main().catch((err) => {
  console.error('Falha ao iniciar:', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  server.close(async () => {
    await pool.end().catch(() => {});
    process.exit(0);
  });
});
