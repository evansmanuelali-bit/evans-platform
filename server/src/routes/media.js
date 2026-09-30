import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { requireAuth } from '../auth.js';
import { rateLimit } from '../rateLimit.js';
import { query } from '../db.js';
import { config } from '../config.js';
import { audit } from '../audit.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 1 },
});

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

router.post(
  '/media/upload',
  requireAuth,
  rateLimit({ windowMs: 60_000, max: 12, key: 'upload' }),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      // Validacao real pelo conteudo (MIME), nao pela extensao do nome.
      if (!ALLOWED.has(req.file.mimetype)) {
        return res.status(400).json({ error: 'Tipo nao permitido. Envie JPG, PNG, WEBP ou GIF.' });
      }

      let img = sharp(req.file.buffer, { animated: req.file.mimetype === 'image/gif' });
      const meta = await img.metadata();
      if ((meta.width || 0) > 2048 || (meta.height || 0) > 2048) {
        img = img.resize(2048, 2048, { fit: 'inside', withoutEnlargement: true });
      }
      const filename = `${crypto.randomBytes(16).toString('hex')}.webp`;
      const filepath = path.join(config.uploadsDir, filename);
      await img.webp({ quality: 82 }).toFile(filepath);
      const size = fs.statSync(filepath).size;

      const url = `/uploads/${filename}`;
      const r = await query(
        "INSERT INTO media (user_id, file_url, file_type, file_size) VALUES ($1, $2, 'image/webp', $3) RETURNING id, file_url, file_size",
        [req.user.id, url, size]
      );
      await audit(req.user.id, 'media.upload', { id: r.rows[0].id, size });
      res.status(201).json({ media: r.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
