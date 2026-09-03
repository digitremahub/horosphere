'use client';

// Compte à rebours vivant vers les prochains événements du ciel (pleine
// lune, nouvelle lune, éclipses). Les dates sont calculées côté serveur
// (voir lib/skyEvents.ts) ; ce composant se contente de faire défiler le
// temps restant, seconde par seconde, côté client.

import { useEffect, useState } from 'react';
import type { SkyEvent } from '@/lib/skyEvents';

function splitRemaining(ms: number) {
  if (ms <= 0) return { j: 0, h: 0, m: 0, s: 0, passed: true };
  return {
    j: Math.floor(ms / 86400000),
    h: Math.floor(ms / 3600000) % 24,
    m: Math.floor(ms / 60000) % 60,
    s: Math.floor(ms / 1000) % 60,
    passed: false,
  };
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export default function SkyCountdown({ events }: { events: SkyEvent[] }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="sky-countdown"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}
    >
      {events.map((e) => {
        const target = new Date(e.dateISO).getTime();
        const remaining = now !== null ? splitRemaining(target - now) : null;
        const dateLabel = new Date(e.dateISO).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

        return (
          <div key={e.key} className="card" style={{ padding: '18px 14px', textAlign: 'center', boxShadow: 'none' }}>
            <div className="field-label" style={{ marginBottom: 10 }}>{e.label}</div>
            <div className="mono" style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--lever-profond)', minHeight: '1.4em' }}>
              {remaining ? (remaining.passed ? 'Maintenant' : `${remaining.j}j ${pad(remaining.h)}h ${pad(remaining.m)}m ${pad(remaining.s)}s`) : '—'}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--sourdine)', marginTop: 8 }}>{dateLabel}</div>
          </div>
        );
      })}
      <style>{`
        @media (max-width: 720px){ .sky-countdown{ grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 420px){ .sky-countdown{ grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
