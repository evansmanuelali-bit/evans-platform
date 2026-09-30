import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api.js';
import { connectWs } from '../ws.js';
import { formatTime } from '../format.js';

function Bubble({ msg, meId, onRetry }) {
  const mine = msg.sender_id === meId;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18 }}
      className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed md:max-w-[65%] ${
          mine
            ? 'rounded-br-md bg-gradient-to-br from-accent to-accent2 text-white'
            : 'rounded-bl-md border border-line bg-panel2 text-slate-100'
        }`}
      >
        {msg.message_type === 'image' && msg.attachment_url && (
          <a href={msg.attachment_url} target="_blank" rel="noreferrer">
            <img
              src={msg.attachment_url}
              alt="Imagem enviada"
              loading="lazy"
              className="mb-1.5 max-h-72 rounded-xl object-cover"
            />
          </a>
        )}
        {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
        <div className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${mine ? 'text-white/70' : 'text-slate-500'}`}>
          <span>{formatTime(msg.created_at)}</span>
          {mine && msg.status === 'sending' && <span>enviando…</span>}
          {mine && msg.status === 'sent' && <span>✓✓</span>}
          {mine && msg.status === 'error' && (
            <button onClick={() => onRetry(msg)} className="font-semibold text-red-300 underline">
              falhou · reenviar
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function ChatWindow({ conversationId, me, otherName }) {
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const [wsStatus, setWsStatus] = useState('connecting');

  const listRef = useRef(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const idRef = useRef(conversationId);
  idRef.current = conversationId;

  const nearBottom = () => {
    const el = listRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 140;
  };

  const scrollBottom = (smooth = true) => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    });
  };

  const load = useCallback(async (before = null) => {
    const q = before ? `&before=${before}` : '';
    const d = await api(`/api/conversations/${idRef.current}/messages?limit=30${q}`);
    return d;
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setMessages([]);
    load()
      .then((d) => {
        if (!alive) return;
        setMessages(d.messages.map((m) => ({ ...m, status: 'sent' })));
        setHasMore(d.hasMore);
        setLoading(false);
        scrollBottom(false);
      })
      .catch(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, load]);

  const markRead = useCallback(() => {
    api(`/api/conversations/${idRef.current}/read`, { method: 'POST' }).catch(() => {});
  }, []);

  useEffect(() => {
    const off = connectWs({
      onStatus: setWsStatus,
      onEvent: (ev) => {
        if (ev.type !== 'message:new' || ev.conversationId !== idRef.current) return;
        const incoming = ev.message;
        setMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          const idx = ev.clientTempId ? prev.findIndex((m) => m.clientTempId === ev.clientTempId) : -1;
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = { ...incoming, status: 'sent' };
            return copy;
          }
          return [...prev, { ...incoming, status: 'sent' }];
        });
        if (incoming.sender_id !== me.id) markRead();
        if (nearBottom()) scrollBottom(true);
      },
    });
    return off;
  }, [conversationId, me.id, markRead]);

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(f.type)) {
      setError('Envie uma imagem (JPG, PNG, WEBP ou GIF).');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('Imagem deve ter no maximo 5MB.');
      return;
    }
    setError('');
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    e.target.value = '';
  };

  const clearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
  };

  async function doSend(content, imageFile, clientTempId) {
    let mediaId;
    if (imageFile) {
      const form = new FormData();
      form.append('file', imageFile);
      const up = await api('/api/media/upload', { method: 'POST', form });
      mediaId = up.media.id;
    }
    await api(`/api/conversations/${idRef.current}/messages`, {
      method: 'POST',
      body: { content, mediaId, clientTempId },
    });
  }

  function send() {
    const content = text.trim();
    if ((!content && !file)) return;
    setError('');
    const clientTempId = crypto.randomUUID();
    const imageFile = file;
    const tempMsg = {
      id: `temp-${clientTempId}`,
      clientTempId,
      conversation_id: conversationId,
      sender_id: me.id,
      content,
      message_type: imageFile ? 'image' : 'text',
      attachment_url: previewUrl || null,
      created_at: new Date().toISOString(),
      status: 'sending',
      _retry: { content, file: imageFile },
    };
    setMessages((prev) => [...prev, tempMsg]);
    setText('');
    clearFile();
    scrollBottom(true);
    doSend(content, imageFile, clientTempId).catch(() => {
      setMessages((prev) =>
        prev.map((m) => (m.clientTempId === clientTempId ? { ...m, status: 'error' } : m))
      );
    });
  }

  function retry(msg) {
    const { content, file: imageFile } = msg._retry || {};
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, status: 'sending' } : m))
    );
    doSend(content || '', imageFile, msg.clientTempId || crypto.randomUUID()).catch(() => {
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, status: 'error' } : m)));
    });
  }

  async function loadOlder() {
    if (!hasMore || loadingMore || messages.length === 0) return;
    setLoadingMore(true);
    const oldest = messages.find((m) => typeof m.id === 'number');
    if (!oldest) {
      setLoadingMore(false);
      return;
    }
    try {
      const d = await load(oldest.id);
      const el = listRef.current;
      const prevH = el?.scrollHeight || 0;
      setMessages((prev) => {
        const known = new Set(prev.map((m) => m.id));
        return [...d.messages.filter((m) => !known.has(m.id)), ...prev];
      });
      setHasMore(d.hasMore);
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevH;
      });
    } catch {
      /* ignore */
    } finally {
      setLoadingMore(false);
    }
  }

  const onScroll = () => {
    const el = listRef.current;
    if (el && el.scrollTop < 60) loadOlder();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* header */}
      <div className="flex items-center justify-between border-b border-line bg-panel/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-accent to-accent2 font-display text-sm font-bold text-white">
            {(otherName || '?').slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="font-display text-sm font-semibold text-white">{otherName || 'Conversa'}</p>
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  wsStatus === 'open' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                }`}
              />
              {wsStatus === 'open' ? 'online em tempo real' : 'reconectando…'}
            </p>
          </div>
        </div>
      </div>

      {/* messages */}
      <div ref={listRef} onScroll={onScroll} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {loading && (
          <div className="grid h-full place-items-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="grid h-full place-items-center text-center text-sm text-slate-500">
            <p>Nenhuma mensagem ainda.<br />Diga oi e comece a conversa.</p>
          </div>
        )}
        {hasMore && !loading && (
          <button
            onClick={loadOlder}
            disabled={loadingMore}
            className="mx-auto block rounded-lg border border-line bg-white/5 px-3 py-1 text-xs text-slate-400 transition hover:bg-white/10"
          >
            {loadingMore ? 'Carregando…' : 'Carregar mensagens anteriores'}
          </button>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} msg={m} meId={me.id} onRetry={retry} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* preview */}
      <AnimatePresence>
        {previewUrl && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-line bg-panel/60 px-4 py-2"
          >
            <div className="relative inline-block">
              <img src={previewUrl} alt="Preview" className="h-20 rounded-lg object-cover" />
              <button
                onClick={clearFile}
                aria-label="Remover imagem"
                className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-xs text-white"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* input */}
      <div className="border-t border-line bg-panel/60 p-3">
        {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
        <div className="flex items-end gap-2">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />
          <button
            onClick={() => fileInputRef.current?.click()}
            aria-label="Anexar imagem"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-white/5 text-slate-300 transition hover:bg-white/10"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="4" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-4.5-4.5L6 21" />
            </svg>
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Escreva uma mensagem…"
            className="input-dark max-h-32 flex-1 resize-none !py-2.5"
          />
          <button
            onClick={send}
            disabled={!text.trim() && !file}
            aria-label="Enviar"
            className="btn-primary !rounded-xl !px-4 !py-2.5"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
