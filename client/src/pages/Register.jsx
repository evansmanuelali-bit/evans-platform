import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../auth.jsx';
import { BRAND } from '../brand.js';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (name.trim().length < 3) return setError('O nome deve ter ao menos 3 caracteres.');
    if (password.length < 6) return setError('A senha deve ter ao menos 6 caracteres.');
    if (password !== confirm) return setError('As senhas nao coincidem.');
    setLoading(true);
    try {
      await register(name.trim(), password, confirm);
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err.details?.[0]?.message || err.message || 'Falha ao criar conta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-ink px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.12),transparent_55%)]" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="card-dark relative w-full max-w-md p-8"
      >
        <Link to="/" className="font-display text-2xl font-extrabold text-white">
          {BRAND}<span className="text-accent">.</span>
        </Link>
        <h1 className="mt-6 font-display text-2xl font-bold text-white">Crie sua conta</h1>
        <p className="mt-1 text-sm text-slate-400">Apenas nome e senha. Simples assim.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm text-slate-300">Nome</label>
            <input
              id="name"
              className="input-dark"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="username"
              maxLength={30}
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
              autoComplete="new-password"
              required
            />
          </div>
          <div>
            <label htmlFor="confirm" className="mb-1.5 block text-sm text-slate-300">Confirmar senha</label>
            <input
              id="confirm"
              type="password"
              className="input-dark"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'Criando…' : 'Criar conta'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Ja tem conta?{' '}
          <Link to="/login" className="font-semibold text-accent2 hover:underline">Entrar</Link>
        </p>
      </motion.div>
    </div>
  );
}
