import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar.jsx';
import Hero3D from '../components/Hero3D.jsx';
import ScrollVideo from '../components/ScrollVideo.jsx';
import { BRAND, BRAND_TAGLINE } from '../brand.js';

const fadeUp = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.7, ease: 'easeOut' },
};

function PlaceholderArt({ label, hue }) {
  return (
    <div
      className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-line"
      style={{ background: `radial-gradient(ellipse at 30% 20%, hsla(${hue},80%,60%,0.25), transparent 60%), linear-gradient(160deg, #0c0e17, #06070c)` }}
    >
      <div className="absolute inset-0 grid place-items-center">
        <p className="px-4 text-center text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export default function Landing() {
  const [hasVideo, setHasVideo] = useState(false);
  useEffect(() => {
    fetch('/media/hero.mp4', { method: 'HEAD' })
      .then((r) => setHasVideo(r.ok && (r.headers.get('content-type') || '').startsWith('video')))
      .catch(() => setHasVideo(false));
  }, []);

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />

      {/* HERO */}
      <section className="relative flex min-h-screen items-center overflow-hidden">
        {hasVideo ? (
          <video
            className="absolute inset-0 h-full w-full object-cover opacity-40"
            src="/media/hero.mp4"
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <Hero3D />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-transparent to-ink" />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pt-24 md:px-8">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7 }}
            className="mb-4 font-display text-sm font-semibold uppercase tracking-[0.3em] text-accent2"
          >
            {BRAND}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="max-w-3xl font-display text-5xl font-extrabold leading-[1.05] text-white md:text-7xl"
          >
            {BRAND_TAGLINE}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.8 }}
            className="mt-6 max-w-xl text-lg text-slate-400"
          >
            Sem feeds, sem ruido, sem espera. Uma conversa privada e direta com quem resolve.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-10 flex flex-wrap gap-4"
          >
            <Link to="/cadastro" className="btn-primary">Criar conta gratuita</Link>
            <a href="#servico" className="btn-ghost">Conhecer</a>
          </motion.div>
        </div>
      </section>

      {/* INTRO */}
      <section id="servico" className="mx-auto max-w-4xl px-5 py-28 text-center md:px-8">
        <motion.h2 {...fadeUp} className="font-display text-3xl font-bold text-white md:text-5xl">
          Um canal. Uma conversa. Zero intermediarios.
        </motion.h2>
        <motion.p {...fadeUp} className="mt-6 text-lg leading-relaxed text-slate-400">
          Aqui voce nao compete por atencao em um grupo cheio de gente. Voce tem um canal privado,
          em tempo real, com respostas de verdade. Mensagens com historico, envio de imagens e
          notificacoes instantaneas.
        </motion.p>
      </section>

      {/* SHOWCASE */}
      <section id="showcase" className="mx-auto max-w-7xl px-5 pb-28 md:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { t: 'Tempo real', d: 'Mensagens entregues na hora, com indicador de status e reconexao automatica.', hue: 265 },
            { t: 'Privacidade por design', d: 'Ninguem ve sua conversa. Apenas voce e o atendente.', hue: 190 },
            { t: 'Imagens e historico', d: 'Envie imagens com preview e consulte todo o historico com paginacao.', hue: 320 },
          ].map((c, i) => (
            <motion.div
              key={c.t}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.6 }}
              className="card-dark p-6 transition hover:border-accent/40"
            >
              <PlaceholderArt label={''} hue={c.hue} />
              <h3 className="mt-5 font-display text-xl font-bold text-white">{c.t}</h3>
              <p className="mt-2 text-slate-400">{c.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SCROLL STORY VIDEO */}
      <ScrollVideo />

      {/* BENEFICIOS */}
      <section id="beneficios" className="mx-auto max-w-7xl px-5 py-28 md:px-8">
        <motion.h2 {...fadeUp} className="text-center font-display text-3xl font-bold text-white md:text-5xl">
          Feito para quem valoriza atencao de verdade
        </motion.h2>
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            ['Direto com o especialista', 'Nada de robos ou filas interminaveis.'],
            ['Sessao segura', 'Entre uma vez e permaneca conectado com seguranca.'],
            ['Sem distracao', 'Interface limpa, focada na conversa.'],
            ['Em qualquer tela', 'Android, iPhone, tablet e desktop.'],
          ].map(([t, d], i) => (
            <motion.div
              key={t}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="card-dark p-6"
            >
              <div className="mb-4 h-1.5 w-10 rounded-full bg-gradient-to-r from-accent to-accent2" />
              <h3 className="font-display font-bold text-white">{t}</h3>
              <p className="mt-2 text-sm text-slate-400">{d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* GALERIA */}
      <section id="galeria" className="mx-auto max-w-7xl px-5 pb-28 md:px-8">
        <motion.h2 {...fadeUp} className="mb-12 text-center font-display text-3xl font-bold text-white md:text-5xl">
          Galeria
        </motion.h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {[250, 200, 300, 170, 280, 220].map((hue, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.94 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            >
              <PlaceholderArt
                label={`galeria-${i + 1}.jpg · substitua em client/public/media/`}
                hue={hue}
              />
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-line">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.18),transparent_60%)]" />
        <div className="relative mx-auto max-w-3xl px-5 py-28 text-center md:px-8">
          <motion.h2 {...fadeUp} className="font-display text-3xl font-bold text-white md:text-5xl">
            Pronto para conversar?
          </motion.h2>
          <motion.p {...fadeUp} className="mt-4 text-slate-400">
            Crie sua conta em menos de um minuto. Sem email, sem burocracia.
          </motion.p>
          <motion.div {...fadeUp} className="mt-8 flex justify-center gap-4">
            <Link to="/cadastro" className="btn-primary">Criar conta</Link>
            <Link to="/login" className="btn-ghost">Ja tenho conta</Link>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-line py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 text-sm text-slate-500 md:flex-row md:px-8">
          <p className="font-display font-bold text-white">{BRAND}<span className="text-accent">.</span></p>
          <p>© {new Date().getFullYear()} {BRAND}. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
