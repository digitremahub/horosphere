'use client';

import { useMemo, useState } from 'react';
import { SIGNS } from '@/lib/zodiac';
import { fallbackHoroscope } from '@/lib/fallback-generator';
import BrandMark from '@/components/BrandMark';
import { SignCircle } from '@/components/CardParts';

export default function FreeTeaser({
  ctaHref = '/connexion',
  ctaLabel = 'Recevoir ma lecture complète',
}: {
  // Résolus côté serveur par la page d'accueil selon l'état de connexion —
  // ne jamais renvoyer quelqu'un de déjà connecté vers /connexion.
  ctaHref?: string;
  ctaLabel?: string;
}) {
  const [signKey, setSignKey] = useState('belier');
  const sign = SIGNS.find((s) => s.key === signKey)!;
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const reading = useMemo(() => fallbackHoroscope(signKey, todayISO), [signKey, todayISO]);

  return (
    <div className="card" style={{ padding: '28px 26px', maxWidth: 480, width: '100%', minWidth: 0, boxSizing: 'border-box', overflow: 'visible' }}>
      <div
        style={{ position: 'absolute', top: -14, right: -14, pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <BrandMark size={72} />
      </div>

      <div className="pill" style={{ marginBottom: 16 }}>Aperçu gratuit</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 18 }}>
        {SIGNS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSignKey(s.key)}
            aria-pressed={s.key === signKey}
            className="pick-btn"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              padding: '9px 2px',
              borderRadius: 12,
              border: `1px solid ${s.key === signKey ? 'var(--lever)' : 'var(--trait)'}`,
              background: s.key === signKey ? 'var(--brume)' : 'transparent',
              color: 'var(--ombre)',
              fontSize: '0.6rem',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '1.15rem', color: s.key === signKey ? 'var(--lever-profond)' : 'var(--sourdine)' }}>{s.symbole}</span>
            {s.nom}
          </button>
        ))}
      </div>

      <div key={signKey} className="fade-swap">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <SignCircle symbole={sign.symbole} size={46} />
          <div>
            <div style={{ fontWeight: 700 }}>{sign.nom}</div>
            <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--sourdine)' }}>{sign.dates}</div>
          </div>
        </div>

        <p className="display" style={{ fontStyle: 'italic', fontSize: '1.15rem', marginBottom: 14 }}>{reading.headline}</p>
        <p style={{ color: 'var(--ombre)', fontSize: '0.95rem', marginBottom: 20 }}>{reading.amour}</p>
      </div>

      <a href={ctaHref} className="btn btn-primary" style={{ width: '100%' }}>
        {ctaLabel}
      </a>
      {ctaHref === '/connexion' && (
        <p style={{ fontSize: '0.76rem', color: 'var(--sourdine)', textAlign: 'center', marginTop: 10 }}>
          Gratuit à la connexion — sans carte bancaire.
        </p>
      )}
    </div>
  );
}
