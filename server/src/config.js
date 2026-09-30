import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT || 4000),
  isProd: process.env.NODE_ENV === 'production',
  databaseUrl: process.env.DATABASE_URL || '',
  pgSsl: process.env.PGSSL === 'true',
  sessionCookie: 'evans_session',
  sessionDays: Number(process.env.SESSION_DAYS || 7),
  adminName: process.env.ADMIN_NAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'evans@xz',
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 5),
  uploadsDir: process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads'),
  clientDist: process.env.CLIENT_DIST || path.join(__dirname, '..', '..', 'client', 'dist'),
};
