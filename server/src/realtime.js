import { WebSocket, WebSocketServer } from 'ws';
import { getUserByToken } from './auth.js';
import { config } from './config.js';

const userSockets = new Map(); // userId -> Set<ws>

function addSocket(userId, ws) {
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId).add(ws);
}

function removeSocket(userId, ws) {
  const set = userSockets.get(userId);
  if (set) {
    set.delete(ws);
    if (set.size === 0) userSockets.delete(userId);
  }
}

export function emitToUsers(userIds, event) {
  const data = JSON.stringify(event);
  for (const id of userIds) {
    const set = userSockets.get(id);
    if (!set) continue;
    for (const ws of set) {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    }
  }
}

function parseCookies(header) {
  const out = {};
  for (const part of (header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function setupRealtime(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const cookies = parseCookies(req.headers.cookie);
    getUserByToken(cookies[config.sessionCookie])
      .then((user) => {
        if (!user) {
          ws.close(4001, 'unauthorized');
          return;
        }
        ws.userId = user.id;
        addSocket(user.id, ws);
        ws.send(JSON.stringify({ type: 'ready' }));
      })
      .catch(() => ws.close(4001, 'unauthorized'));

    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    ws.on('close', () => {
      if (ws.userId) removeSocket(ws.userId, ws);
    });
  });

  const interval = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, 30_000);

  wss.on('close', () => clearInterval(interval));
  return wss;
}
