'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

// Affichée une seule fois par utilisateur (le serveur ne rend ce composant
// que si profiles.a_vu_onboarding est encore faux, voir app/page.tsx) —
// toujours "passable" immédiatement, jamais bloquante. Marque le flag dès
// la fin de la vidéo OU un clic sur "passer" : dans les deux cas, elle ne
// se réaffichera plus jamais aux connexions suivantes.
export default function OnboardingVideoModal({ videoUrl }: { videoUrl: string }) {
  const [visible, setVisible] = useState(true);
  const t = useTranslations('Onboarding');

  async function fermer() {
    setVisible(false);
    try {
      await fetch('/api/onboarding/seen', { method: 'POST' });
    } catch {
      // Rien de grave à afficher : au pire, la vidéo se réaffichera à la
      // prochaine visite si l'enregistrement du flag a échoué.
    }
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20,15,10,0.75)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div style={{ position: 'relative', maxWidth: 640, width: '100%' }}>
        <video
          src={videoUrl}
          controls
          autoPlay
          onEnded={fermer}
          style={{ width: '100%', borderRadius: 16, display: 'block' }}
        />
        <button
          type="button"
          onClick={fermer}
          className="btn btn-ghost"
          style={{ position: 'absolute', top: -46, right: 0, color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}
        >
          {t('skip')}
        </button>
      </div>
    </div>
  );
}
