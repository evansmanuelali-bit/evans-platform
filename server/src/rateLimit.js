// Rate limit simples em memoria (adequado para 1 instancia no Render).
// Se um dia escalar para varias instancias, trocar por Redis/Upstash.
const buckets = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, b] of buckets) {
    if (b.reset < now) buckets.delete(key);
  }
}, 60_000).unref();

export function rateLimit({ windowMs = 60_000, max = 60, key = 'global' } = {}) {
  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const k = `${key}:${ip}`;
    const now = Date.now();
    let b = buckets.get(k);
    if (!b || b.reset < now) {
      b = { count: 0, reset: now + windowMs };
      buckets.set(k, b);
    }
    b.count += 1;
    if (b.count > max) {
      res.set('Retry-After', String(Math.ceil((b.reset - now) / 1000)));
      return res.status(429).json({ error: 'Muitas tentativas. Aguarde um instante e tente novamente.' });
    }
    next();
  };
}
