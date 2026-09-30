import crypto from 'crypto';
import argon2 from 'argon2';
import { query } from './db.js';
import { config } from './config.js';

export const hashPassword = (pw) => argon2.hash(pw, { type: argon2.argon2id });

export async function verifyPassword(hash, pw) {
  try {
    return await argon2.verify(hash, pw);
  } catch {
    return false;
  }
}

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const hashToken = sha256;

export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + config.sessionDays * 864e5);
  await query('INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [
    userId,
    hashToken(token),
    expires,
  ]);
  return token;
}

export async function destroySession(token) {
  if (!token) return;
  await query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
}

export async function getUserByToken(token) {
  if (!token) return null;
  const r = await query(
    `SELECT u.id, u.name, u.role, u.status, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now() AND u.status = 'active'`,
    [hashToken(token)]
  );
  return r.rows[0] || null;
}

export const readToken = (req) => req.cookies?.[config.sessionCookie] || null;

export async function attachUser(req, _res, next) {
  try {
    req.user = await getUserByToken(readToken(req));
  } catch {
    req.user = null;
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Nao autenticado' });
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Nao autenticado' });
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });
  next();
}

export function setSessionCookie(res, token) {
  res.cookie(config.sessionCookie, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    maxAge: config.sessionDays * 864e5,
    path: '/',
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(config.sessionCookie, { httpOnly: true, sameSite: 'lax', secure: config.isProd, path: '/' });
}
