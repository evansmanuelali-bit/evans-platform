import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';
import { connectWs } from '../ws.js';
import ChatWindow from '../components/ChatWindow.jsx';
import { BRAND } from '../brand.js';
import { formatDateTime } from '../format.js';

export default function ClientHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState(null);
  const [unread, setUnread] = useState(0);
  const [lastActivity, setLastActivity] = useState(null);

  const load = useCallback(async () => {
    try {
      const d = await api('/api/conversations');
      const convo = d.conversations[0];
      setConversation(convo || null);
      setUnread(convo?.unread ?? 0);
      setLastActivity(convo?.last_at ?? null);
    } catch {
      /* sessao pode ter expirado */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const off = connectWs({
      onEvent: (ev) => {
        if (ev.type === 'message:new') load();
      },
    });
    return off;
  }, [load]);

  async function handleLogout() {
    await logout();
    navigate('/', { replace: true });
  }

  return (
    <div className="flex h-screen flex-col bg-ink">
      <header className="flex items-center justify-between border-b border-line bg-panel/60 px-4 py-3 md:px-6">
        <p className="font-display text-lg font-extrabold text-white">
          {BRAND}<span className="text-accent">.</span>
        </p>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-400 sm:block">Ola, <strong className="text-white">{user.name}</strong></span>
          <button onClick={handleLogout} className="btn-ghost !px-4 !py-1.5 text-sm">Sair</button>
        </div>
      </header>

      <div className="grid flex-1 gap-4 overflow-hidden p-4 lg:grid-cols-[300px_1fr]">
        {/* Dashboard lateral */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card-dark hidden flex-col gap-4 p-5 lg:flex"
        >
          <h2 className="font-display text-lg font-bold text-white">Meu painel</h2>
          <div className="rounded-xl border border-line bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Status</p>
            <p className="mt-1 flex items-center gap-2 font-semibold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Conta ativa
            </p>
          </div>
          <div className="rounded-xl border border-line bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Nao lidas</p>
            <p className="mt-1 font-display text-2xl font-bold text-white">{unread}</p>
          </div>
          <div className="rounded-xl border border-line bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Ultima atividade</p>
            <p className="mt-1 text-sm text-slate-300">{formatDateTime(lastActivity)}</p>
          </div>
          <p className="mt-auto text-xs leading-relaxed text-slate-500">
            Este e um canal privado entre voce e a equipe {BRAND}. Nenhum outro cliente pode ver esta conversa.
          </p>
        </motion.aside>

        {/* Chat */}
        <motion.main
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-dark min-h-0 overflow-hidden"
        >
          {conversation ? (
            <ChatWindow conversationId={conversation.id} me={user} otherName={conversation.other_name} />
          ) : (
            <div className="grid h-full place-items-center p-6 text-center">
              <div>
                <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-line border-t-accent" />
                <p className="text-slate-400">Preparando sua conversa…</p>
              </div>
            </div>
          )}
        </motion.main>
      </div>
    </div>
  );
}
