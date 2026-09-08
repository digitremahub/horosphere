'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

// Lecture automatique en muet (seul pattern autorisé par les navigateurs
// sans interaction préalable), avec un bouton pour activer le son —
// jamais de lecture forcée bloquante. Réutilisé pour le teaser homepage et
// le récap hebdomadaire (voir page.tsx).
export default function VideoAvecSon({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const t = useTranslations('Home');

  function activerSon() {
    if (!ref.current) return;
    ref.current.muted = !ref.current.muted;
    setMuted(ref.current.muted);
  }

  return (
    <div style={{ position: 'relative' }}>
      <video
        ref={ref}
        src={src}
        autoPlay
        muted
        playsInline
        loop={false}
        controls
        style={{ width: '100%', borderRadius: 16, display: 'block', background: 'var(--ombre)' }}
      />
      <button
        type="button"
        onClick={activerSon}
        className="btn btn-ghost"
        style={{ position: 'absolute', top: 12, right: 12, padding: '6px 12px', fontSize: '0.76rem' }}
      >
        {muted ? t('unmuteVideo') : t('mutedOffVideo')}
      </button>
    </div>
  );
}
