import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../auth.jsx';
import { BRAND } from '../brand.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(name.trim(), password);
      navigate(user.role === 'ADMIN' ? '/admin' : '/app', { replace: true });
    } catch (err) {
      setError(err.message || 'Falha ao entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-ink px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.16),transparent_55%)]" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="card-dark relative w-full max-w-md p-8"
      >
        <Link to="/" className="font-display text-2xl font-extrabold text-white">
          {BRAND}<span className="text-accent">.</span>
        </Link>
        <h1 className="mt-6 font-display text-2xl font-bold text-white">Bem-vindo de volta</h1>
        <p className="mt-1 text-sm text-slate-400">Entre para continuar sua conversa.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm text-slate-300">Nome</label>
            <input
              id="name"
              className="input-dark"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm text-slate-300">Senha</label>
            <input
              id="password"
              type="password"
              className="input-dark"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Nao tem conta?{' '}
          <Link to="/cadastro" className="font-semibold text-accent2 hover:underline">Criar conta</Link>
        </p>
      </motion.div>
    </div>
  );
}
