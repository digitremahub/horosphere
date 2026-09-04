'use client';

import { useEffect, useState } from 'react';

// Bouton flottant, visible dès qu'on a un peu défilé, sur toutes les pages
// (voir layout.tsx) — remonte en haut sans jamais provoquer de défilement
// non désiré ailleurs (contrairement à une navigation Next.js classique,
// qui remonte en haut par défaut : voir scroll={false} sur les liens de
// /actualites pour changer d'article sans ce saut).
export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Revenir en haut de la page"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 50,
        width: 48,
        height: 48,
        borderRadius: '50%',
        border: '1px solid var(--trait)',
        background: 'var(--nacre)',
        boxShadow: 'var(--shadow)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        cursor: 'pointer',
      }}
    >
      <img src="/images/logo-mark.png" alt="" width={26} height={26} style={{ display: 'block', borderRadius: '50%' }} />
    </button>
  );
}
