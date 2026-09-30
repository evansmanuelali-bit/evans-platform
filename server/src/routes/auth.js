import { Router } from 'express';
import { z } from 'zod';
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
  readToken,
  requireAuth,
} from '../auth.js';
import { rateLimit } from '../rateLimit.js';
import { validate } from '../validate.js';
import { audit } from '../audit.js';
import { findUserByName, createUser, getOrCreateConversation, getAdmin } from '../repo.js';

const router = Router();

const passwordSchema = z
  .string()
  .min(6, 'A senha deve ter ao menos 6 caracteres')
  .max(72, 'A senha e muito longa');

const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, 'O nome deve ter ao menos 3 caracteres')
      .max(30, 'O nome deve ter no maximo 30 caracteres')
      .regex(/^[\p{L}\p{N} ._-]+$/u, 'O nome contem caracteres invalidos'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas nao coincidem',
    path: ['confirmPassword'],
  });

router.post(
  '/register',
  rateLimit({ windowMs: 60_000, max: 10, key: 'register' }),
  validate(registerSchema),
  async (req, res, next) => {
    try {
      const { name, password } = req.body;
      const admin = await getAdmin();
      if (!admin) return res.status(500).json({ error: 'Administrador nao configurado' });

      const existing = await findUserByName(name);
      if (existing) return res.status(409).json({ error: 'Este nome ja esta em uso' });

      const user = await createUser(name, await hashPassword(password));
      // Regra fundamental: o servidor cria a conversa do cliente APENAS com o admin unico.
      await getOrCreateConversation(user.id);
      await audit(user.id, 'user.register', { name });

      const token = await createSession(user.id);
      setSessionCookie(res, token);
      res.status(201).json({ user: { id: user.id, name: user.name, role: user.role } });
    } catch (err) {
      next(err);
    }
  }
);

const loginSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome').max(60),
  password: z.string().min(1, 'Informe a senha').max(72),
});

router.post(
  '/login',
  rateLimit({ windowMs: 60_000, max: 8, key: 'login' }),
  validate(loginSchema),
  async (req, res, next) => {
    try {
      const { name, password } = req.body;
      const user = await findUserByName(name);
      const ok = user && (await verifyPassword(user.password_hash, password));

      if (!ok) {
        // Mensagem generica: nao revelar se o nome existe (anti enumeracao).
        await audit(user?.id ?? null, 'auth.login_failed', { name });
        return res.status(401).json({ error: 'Nome ou senha invalidos' });
      }
      if (user.status !== 'active') {
        return res.status(403).json({ error: 'Conta desativada. Fale com o administrador.' });
      }

      const token = await createSession(user.id);
      setSessionCookie(res, token);
      await audit(user.id, 'auth.login', {});
      res.json({ user: { id: user.id, name: user.name, role: user.role } });
    } catch (err) {
      next(err);
    }
  }
);

router.post('/logout', async (req, res, next) => {
  try {
    await destroySession(readToken(req));
    clearSessionCookie(res);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: { id: req.user.id, name: req.user.name, role: req.user.role } });
});

export default router;
