import { query } from './db.js';
import { hashPassword } from './auth.js';
import { config } from './config.js';

// Cria o unico administrador na primeira execucao (se ainda nao existir).
export async function seedAdmin() {
  const r = await query("SELECT id FROM users WHERE role = 'ADMIN' ORDER BY id ASC LIMIT 1");
  if (r.rowCount > 0) return;
  await query("INSERT INTO users (name, password_hash, role) VALUES ($1, $2, 'ADMIN')", [
    config.adminName,
    await hashPassword(config.adminPassword),
  ]);
  console.log(`[seed] Administrador criado: "${config.adminName}"`);
}
