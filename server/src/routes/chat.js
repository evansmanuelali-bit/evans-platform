import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth.js';
import { rateLimit } from '../rateLimit.js';
import { validate } from '../validate.js';
import { query } from '../db.js';
import * as repo from '../repo.js';
import { emitToUsers } from '../realtime.js';

const router = Router();
router.use(requireAuth);

// Autorizacao central: cliente so acessa a propria conversa; admin acessa as suas.
async function authorizeConversation(req, res) {
  const convo = await repo.getConversationById(Number(req.params.id));
  if (!convo) {
    res.status(404).json({ error: 'Conversa nao encontrada' });
    return null;
  }
  const allowed =
    req.user.role === 'ADMIN'
      ? convo.admin_id === req.user.id
      : convo.customer_id === req.user.id;
  if (!allowed) {
    res.status(403).json({ error: 'Acesso negado' });
    return null;
  }
  return convo;
}

router.get('/conversations', async (req, res, next) => {
  try {
    const conversations =
      req.user.role === 'ADMIN'
        ? await repo.listConversationsForAdmin(req.user.id)
        : await repo.listConversationsForCustomer(req.user.id);
    res.json({ conversations });
  } catch (err) {
    next(err);
  }
});

router.get('/conversations/:id/messages', async (req, res, next) => {
  try {
    const convo = await authorizeConversation(req, res);
    if (!convo) return;
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const beforeRaw = req.query.before ? Number(req.query.before) : null;
    if (beforeRaw !== null && (!Number.isInteger(beforeRaw) || beforeRaw < 1)) {
      return res.status(400).json({ error: 'Cursor invalido' });
    }
    const data = await repo.listMessages(convo.id, { before: beforeRaw, limit });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

const messageSchema = z
  .object({
    content: z.string().trim().max(2000, 'Mensagem muito longa').optional().default(''),
    mediaId: z.coerce.number().int().positive().optional(),
    clientTempId: z.string().max(64).optional(),
  })
  .refine((d) => d.content.length > 0 || d.mediaId, { message: 'Mensagem vazia' });

router.post(
  '/conversations/:id/messages',
  rateLimit({ windowMs: 60_000, max: 30, key: 'msg' }),
  validate(messageSchema),
  async (req, res, next) => {
    try {
      const convo = await authorizeConversation(req, res);
      if (!convo) return;

      const { content, mediaId, clientTempId } = req.body;

      let type = 'text';
      let attachmentUrl = null;
      if (mediaId) {
        const r = await query('SELECT * FROM media WHERE id = $1', [mediaId]);
        const media = r.rows[0];
        // Só quem fez upload pode anexar o arquivo, e sempre como remetente da mensagem.
        if (!media || media.user_id !== req.user.id) {
          return res.status(400).json({ error: 'Arquivo invalido' });
        }
        type = 'image';
        attachmentUrl = media.file_url;
      }

      // Regra fundamental: o servidor define remetente/destinatario.
      // NUNCA confiar em recipient_id vindo do frontend.
      const message = await repo.createMessage({
        conversationId: convo.id,
        senderId: req.user.id,
        content,
        type,
        attachmentUrl,
      });
      await repo.touchConversation(convo.id);

      emitToUsers([convo.customer_id, convo.admin_id], {
        type: 'message:new',
        conversationId: convo.id,
        message,
        clientTempId,
      });

      res.status(201).json({ message, clientTempId });
    } catch (err) {
      next(err);
    }
  }
);

router.post('/conversations/:id/read', async (req, res, next) => {
  try {
    const convo = await authorizeConversation(req, res);
    if (!convo) return;
    await repo.markConversationRead(convo.id, req.user.id);
    emitToUsers([convo.customer_id, convo.admin_id], {
      type: 'conversation:read',
      conversationId: convo.id,
      readerId: req.user.id,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
