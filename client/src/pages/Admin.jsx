import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';
import { connectWs } from '../ws.js';
import ChatWindow from '../components/ChatWindow.jsx';
import { BRAND } from '../brand.js';
import { formatDateTime, formatTime } from '../format.js';

export default function Admin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState('chat'); // 'dashboard' | 'chat'
  const [customers, setCustomers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const d = await api('/api/conversations');
      setConversations(d.conversations);
    } catch { /* ignore */ }
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      const d = await api(`/api/admin/customers?search=${encodeURIComponent(search)}`);
      setCustomers(d.customers);
    } catch { /* ignore */ }
  }, [search]);

  const loadStats = useCallback(async () => {
    try {
      const d = await api('/api/admin/stats');
      setStats(d);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadConversations();
    loadStats();
  }, [loadConversations, loadStats]);

  useEffect(() => {
    const t = setTimeout(loadCustomers, 250);
    return () => clearTimeout(t);
  }, [loadCustomers]);

  useEffect(() => {
    const off = connectWs({
      onEvent: (ev) => {
        if (ev.type === 'message:new' || ev.type === 'conversation:read') {
          loadConversations();
          loadStats();
        }
      },
    });
    return off;
  }, [loadConversations, loadStats]);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) || null,
    [conversations, selectedId]
  );

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unread || 0), 0);

  async function toggleStatus(c) {
    const next = c.status === 'active' ? 'blocked' : 'active';
    try {
      await api(`/api/admin/customers/${c.id}/status`, { method: 'POST', body: { status: next } });
      loadCustomers();
      loadConversations();
    } catch { /* ignore */ }
  }

  async function handleLogout() {
    await logout();
    navigate('/', { replace: true });
  }

  function openChat(c) {
    setSelectedId(c.id);
    setMobileChatOpen(true);
  }

  const menu = [
    { id: 'chat', label: 'Conversas', icon: '💬', badge: totalUnread },
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-ink">
      {/* Sidebar */}
      <aside className="flex w-16 flex-col border-r border-line bg-panel/70 md:w-60">
        <div className="flex h-16 items-center justify-center border-b border-line md:justify-start md:px-5">
          <p className="font-display text-lg font-extrabold text-white">{BRAND}<span className="text-accent">.</span></p>
          <span className="ml-2 hidden rounded-md bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent2 md:inline">admin</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-2">
          {menu.map((m) => (
            <button
              key={m.id}
              onClick={() => setView(m.id)}
              className={`flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition md:justify-start ${
                view === m.id ? 'bg-accent/15 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span>{m.icon}</span>
              <span className="hidden md:inline">{m.label}</span>
              {m.badge > 0 && (
                <span className="ml-auto hidden rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white md:inline">
                  {m.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="border-t border-line p-2">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white md:justify-start"
          >
            <span>⏻</span><span className="hidden md:inline">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1">
        {view === 'dashboard' ? (
          <main className="flex-1 overflow-y-auto p-5 md:p-8">
            <h1 className="font-display text-2xl font-bold text-white">Dashboard</h1>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Clientes', stats?.totalCustomers ?? '—'],
                ['Clientes ativos', stats?.activeCustomers ?? '—'],
                ['Mensagens nao lidas', stats?.unreadMessages ?? '—'],
                ['Total de mensagens', stats?.totalMessages ?? '—'],
              ].map(([label, value]) => (
                <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card-dark p-5">
                  <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
                  <p className="mt-2 font-display text-3xl font-extrabold text-white">{value}</p>
                </motion.div>
              ))}
            </div>

            <h2 className="mt-10 font-display text-lg font-bold text-white">Atividade recente</h2>
            <div className="card-dark mt-4 divide-y divide-line">
              {(stats?.recent || []).map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    const convo = conversations.find((c) => c.id === m.conversation_id);
                    if (convo) {
                      setSelectedId(convo.id);
                      setView('chat');
                      setMobileChatOpen(true);
                    }
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.03]"
                >
                  <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${m.sender_role === 'ADMIN' ? 'bg-accent/25 text-accent2' : 'bg-white/10 text-slate-300'}`}>
                    {m.sender_name?.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-200">
                      <strong className="text-white">{m.sender_name}</strong>
                      {m.message_type === 'image' ? ' enviou uma imagem' : `: ${m.content}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">{formatTime(m.created_at)}</span>
                  {!m.read_at && m.sender_role === 'CLIENT' && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                  )}
                </button>
              ))}
              {stats && stats.recent.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-slate-500">Nenhuma atividade ainda.</p>
              )}
            </div>
          </main>
        ) : (
          <>
            {/* Lista de conversas / clientes */}
            <section
              className={`w-full flex-col border-r border-line bg-panel/40 md:flex md:w-80 lg:w-96 ${
                mobileChatOpen ? 'hidden' : 'flex'
              }`}
            >
              <div className="border-b border-line p-3">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquisar clientes…"
                  className="input-dark !py-2.5 text-sm"
                  aria-label="Pesquisar clientes"
                />
              </div>
              <div className="flex-1 overflow-y-auto">
                <AnimatePresence initial={false}>
                  {conversations.map((c) => (
                    <motion.button
                      key={c.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => openChat(c)}
                      className={`flex w-full items-center gap-3 border-b border-line/60 px-4 py-3.5 text-left transition ${
                        selectedId === c.id ? 'bg-accent/10' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent/60 to-accent2/60 font-display text-sm font-bold text-white">
                        {c.other_name?.slice(0, 1).toUpperCase()}
                        {c.other_status === 'blocked' && (
                          <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-red-500 text-[9px]">✕</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-white">{c.other_name}</p>
                          <span className="shrink-0 text-[11px] text-slate-500">{formatTime(c.last_at)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs text-slate-400">
                            {c.last_type === 'image' ? 'Imagem' : c.last_content || 'Sem mensagens'}
                          </p>
                          {c.unread > 0 && (
                            <span className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                              {c.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
                {conversations.length === 0 && (
                  <p className="px-4 py-8 text-center text-sm text-slate-500">
                    Nenhum cliente ainda.
                  </p>
                )}

                {/* Acoes sobre cliente selecionado */}
                {selected && (
                  <div className="border-t border-line p-3">
                    <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Cliente selecionado</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleStatus({ id: selected.other_id, status: selected.other_status })}
                        className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                          selected.other_status === 'active'
                            ? 'bg-red-500/15 text-red-300 hover:bg-red-500/25'
                            : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                        }`}
                      >
                        {selected.other_status === 'active' ? 'Bloquear' : 'Desbloquear'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Chat */}
            <section className={`min-w-0 flex-1 flex-col md:flex ${mobileChatOpen ? 'flex' : 'hidden'}`}>
              {selected ? (
                <div className="flex h-full min-h-0 flex-col">
                  <div className="flex items-center gap-3 border-b border-line bg-panel/60 px-4 py-2.5 md:hidden">
                    <button
                      onClick={() => setMobileChatOpen(false)}
                      className="rounded-lg border border-line bg-white/5 px-3 py-1.5 text-sm"
                    >
                      ← Voltar
                    </button>
                    <p className="font-display text-sm font-bold text-white">{selected.other_name}</p>
                  </div>
                  <div className="min-h-0 flex-1">
                    <ChatWindow conversationId={selected.id} me={user} otherName={selected.other_name} />
                  </div>
                </div>
              ) : (
                <div className="grid flex-1 place-items-center p-6 text-center">
                  <div>
                    <p className="font-display text-xl font-bold text-white">Selecione uma conversa</p>
                    <p className="mt-2 text-sm text-slate-500">Escolha um cliente na lista para comecar.</p>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
