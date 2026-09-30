import { query } from './db.js';

export async function audit(userId, action, metadata = {}) {
  try {
    await query('INSERT INTO audit_logs (user_id, action, metadata) VALUES ($1, $2, $3)', [
      userId,
      action,
      JSON.stringify(metadata),
    ]);
  } catch (err) {
    console.error('[audit]', err.message);
  }
}
