import { query } from './db.js';

export const getAdmin = async () =>
  (await query("SELECT * FROM users WHERE role = 'ADMIN' ORDER BY id ASC LIMIT 1")).rows[0];

export const findUserByName = async (name) =>
  (await query('SELECT * FROM users WHERE lower(name) = lower($1)', [name])).rows[0];

export const getUserById = async (id) =>
  (await query('SELECT id, name, role, status, created_at FROM users WHERE id = $1', [id])).rows[0];

export const createUser = async (name, passwordHash) =>
  (
    await query("INSERT INTO users (name, password_hash, role) VALUES ($1, $2, 'CLIENT') RETURNING id, name, role, status, created_at", [
      name,
      passwordHash,
    ])
  ).rows[0];

export const getConversationById = async (id) =>
  (await query('SELECT * FROM conversations WHERE id = $1', [id])).rows[0];

export async function getOrCreateConversation(customerId) {
  const admin = await getAdmin();
  if (!admin) throw new Error('ADMIN_NAO_CONFIGURADO');
  return (
    await query(
      `INSERT INTO conversations (customer_id, admin_id) VALUES ($1, $2)
       ON CONFLICT (customer_id, admin_id) DO UPDATE SET customer_id = EXCLUDED.customer_id
       RETURNING *`,
      [customerId, admin.id]
    )
  ).rows[0];
}

const LAST_MSG = `(SELECT m.content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1)`;
const LAST_TYPE = `(SELECT m.message_type FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1)`;
const LAST_AT = `(SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1)`;

export async function listConversationsForCustomer(customerId) {
  const r = await query(
    `SELECT c.id, c.created_at,
            a.id AS other_id, a.name AS other_name, 'admin' AS other_role,
            ${LAST_MSG} AS last_content, ${LAST_TYPE} AS last_type, ${LAST_AT} AS last_at,
            (SELECT count(*)::int FROM messages m
              WHERE m.conversation_id = c.id AND m.read_at IS NULL AND m.sender_id <> $1) AS unread
       FROM conversations c JOIN users a ON a.id = c.admin_id
      WHERE c.customer_id = $1
      ORDER BY COALESCE(${LAST_AT}, c.created_at) DESC`,
    [customerId]
  );
  return r.rows;
}

export async function listConversationsForAdmin(adminId) {
  const r = await query(
    `SELECT c.id, c.created_at,
            u.id AS other_id, u.name AS other_name, 'client' AS other_role, u.status AS other_status,
            ${LAST_MSG} AS last_content, ${LAST_TYPE} AS last_type, ${LAST_AT} AS last_at,
            (SELECT count(*)::int FROM messages m
              WHERE m.conversation_id = c.id AND m.read_at IS NULL AND m.sender_id <> $1) AS unread
       FROM conversations c JOIN users u ON u.id = c.customer_id
      WHERE c.admin_id = $1
      ORDER BY COALESCE(${LAST_AT}, c.created_at) DESC`,
    [adminId]
  );
  return r.rows;
}

export async function listMessages(conversationId, { before = null, limit = 30 } = {}) {
  const params = [conversationId, limit];
  let where = 'conversation_id = $1';
  if (before) {
    params.push(before);
    where += ' AND id < $3';
  }
  const r = await query(`SELECT * FROM messages WHERE ${where} ORDER BY id DESC LIMIT $2`, params);
  const rows = r.rows;
  return {
    messages: rows.slice().reverse(),
    hasMore: rows.length === limit,
    nextBefore: rows.length ? rows[rows.length - 1].id : before,
  };
}

export const createMessage = async ({ conversationId, senderId, content, type = 'text', attachmentUrl = null }) =>
  (
    await query(
      `INSERT INTO messages (conversation_id, sender_id, content, message_type, attachment_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [conversationId, senderId, content, type, attachmentUrl]
    )
  ).rows[0];

export const touchConversation = (id) =>
  query('UPDATE conversations SET updated_at = now() WHERE id = $1', [id]);

export const markConversationRead = (conversationId, readerId) =>
  query(
    'UPDATE messages SET read_at = now() WHERE conversation_id = $1 AND read_at IS NULL AND sender_id <> $2',
    [conversationId, readerId]
  );
