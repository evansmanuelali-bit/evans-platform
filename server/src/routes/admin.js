import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin } from '../auth.js';
import { validate } from '../validate.js';
import { query } from '../db.js';
import * as repo from '../repo.js';
import { audit } from '../audit.js';

const router = Router();
router.use(requireAdmin);

router.get('/stats', async (_req, res, next) => {
  try {
    const customers = await query(
      "SELECT count(*)::int AS total, count(*) FILTER (WHERE status = 'active')::int AS active FROM users WHERE role = 'CLIENT'"
    );
    const unread = await query(
      `SELECT count(*)::int AS n FROM messages m
        JOIN users u ON u.id = m.sender_id
       WHERE m.read_at IS NULL AND u.role = 'CLIENT'`
    );
    const messages = await query('SELECT count(*)::int AS total FROM messages');
    const recent = await query(
      `SELECT m.id, m.conversation_id, m.content, m.message_type, m.created_at, m.read_at,
              u.name AS sender_name, u.role AS sender_role
         FROM messages m JOIN users u ON u.id = m.sender_id
        ORDER BY m.id DESC LIMIT 10`
    );
    res.json({
      totalCustomers: customers.rows[0].total,
      activeCustomers: customers.rows[0].active,
      unreadMessages: unread.rows[0].n,
      totalMessages: messages.rows[0].total,
      recent: recent.rows,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/customers', async (req, res, next) => {
  try {
    const search =
      typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 50) : '';
    const params = [];
    let where = "u.role = 'CLIENT'";
    if (search) {
      params.push(`%${search}%`);
      where += ' AND u.name ILIKE $1';
    }
    const r = await query(
      `SELECT u.id, u.name, u.status, u.created_at,
              (SELECT count(*)::int FROM messages m
                WHERE m.sender_id = u.id AND m.read_at IS NULL) AS unread,
              (SELECT max(m.created_at) FROM messages m
                 JOIN conversations c ON c.id = m.conversation_id
                WHERE c.customer_id = u.id) AS last_activity
         FROM users u
        WHERE ${where}
        ORDER BY u.created_at DESC
        LIMIT 200`,
      params
    );
    res.json({ customers: r.rows });
  } catch (err) {
    next(err);
  }
});

const statusSchema = z.object({ status: z.enum(['active', 'blocked']) });

router.post('/customers/:id/status', validate(statusSchema), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'ID invalido' });
    if (id === req.user.id) return res.status(400).json({ error: 'Voce nao pode alterar o proprio status' });

    const r = await query(
      "UPDATE users SET status = $2, updated_at = now() WHERE id = $1 AND role = 'CLIENT' RETURNING id, name, status",
      [id, req.body.status]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Cliente nao encontrado' });

    if (req.body.status === 'blocked') {
      await query('DELETE FROM sessions WHERE user_id = $1', [id]);
    }
    await audit(req.user.id, 'admin.customer_status', { id, status: req.body.status });
    res.json({ customer: r.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.get('/conversations', async (req, res, next) => {
  try {
    res.json({ conversations: await repo.listConversationsForAdmin(req.user.id) });
  } catch (err) {
    next(err);
  }
});

export default router;
