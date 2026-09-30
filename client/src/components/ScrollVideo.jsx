import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

// Video sincronizado com o scroll: 0% -> 0s, 50% -> metade, 100% -> fim.
// Fallback elegante se o video nao existir em /media/hero.mp4.
export default function ScrollVideo() {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const [missing, setMissing] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const io = new IntersectionObserver(
      (entries) => setActive(entries[0].isIntersecting),
      { rootMargin: '200px' }
    );
    io.observe(section);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!active || missing) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const section = sectionRef.current;
        const video = videoRef.current;
        if (!section || !video || !video.duration) return;
        const rect = section.getBoundingClientRect();
        const scrollable = rect.height - window.innerHeight;
        if (scrollable <= 0) return;
        const progress = Math.min(1, Math.max(0, -rect.top / scrollable));
        video.currentTime = progress * video.duration;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [active, missing]);

  return (
    <section ref={sectionRef} className="relative h-[260vh]" aria-label="Historia em video">
      <div className="sticky top-0 h-screen overflow-hidden">
        {missing ? (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.28),transparent_60%)]" />
        ) : (
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            src="/media/hero.mp4"
            poster="/media/poster.jpg"
            muted
            playsInline
            preload="metadata"
            onError={() => setMissing(true)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-ink via-transparent to-ink" />
        <div className="absolute inset-0 grid place-items-center">
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl px-6 text-center font-display text-3xl font-bold text-white md:text-5xl"
          >
            Cada detalhe pensado para uma experiencia impecavel.
          </motion.p>
        </div>
      </div>
    </section>
  );
}
