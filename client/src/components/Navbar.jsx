import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../auth.jsx';
import { BRAND } from '../brand.js';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    fn();
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className={`fixed inset-x-0 top-0 z-50 transition-colors ${
        scrolled ? 'border-b border-line bg-ink/80 backdrop-blur-xl' : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link to="/" className="font-display text-xl font-extrabold tracking-tight text-white">
          {BRAND}
          <span className="text-accent">.</span>
        </Link>
        <div className="hidden items-center gap-8 text-sm text-slate-400 md:flex">
          <a href="#servico" className="transition hover:text-white">Servico</a>
          <a href="#showcase" className="transition hover:text-white">Showcase</a>
          <a href="#beneficios" className="transition hover:text-white">Beneficios</a>
          <a href="#galeria" className="transition hover:text-white">Galeria</a>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <button
              onClick={async () => {
                await logout();
                navigate('/');
              }}
              className="btn-ghost !px-4 !py-2 text-sm"
            >
              {user.name} · Sair
            </button>
          ) : (
            <>
              <Link to="/login" className="btn-ghost !px-4 !py-2 text-sm">Entrar</Link>
              <Link to="/cadastro" className="btn-primary !px-4 !py-2 text-sm">Criar conta</Link>
            </>
          )}
        </div>
      </nav>
    </motion.header>
  );
}
