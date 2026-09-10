'use client';

// Compte à rebours vivant vers les prochains événements du ciel (pleine
// lune, nouvelle lune, éclipses). Les dates sont calculées côté serveur
// (voir lib/skyEvents.ts) ; ce composant se contente de faire défiler le
// temps restant, seconde par seconde, côté client.
//
// Regroupé par paire plutôt qu'aligné chronologiquement (nouvelle/pleine
// lune sur une ligne, éclipses sur la suivante, chacune illustrée) : plus
// compact qu'une bande de 4 cartes étirée sur toute la largeur, tout en
// restant lisible d'un coup d'œil.

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { SkyEvent } from '@/lib/skyEvents';
import { dateLocaleTag } from '@/i18n/dateLocale';
import MoonPhase from './MoonPhase';
import EclipseIcon from './EclipseIcon';

const KEY_TO_MESSAGE: Record<string, string> = {
  'pleine-lune': 'nextFullMoon',
  'nouvelle-lune': 'nextNewMoon',
  'eclipse-lunaire': 'nextLunarEclipse',
  'eclipse-solaire': 'nextSolarEclipse',
};

// Ordre volontairement fixe (pas l'ordre chronologique reçu) : les deux
// phases de lune ensemble, puis les deux éclipses — voir le commentaire ci-dessus.
const DISPLAY_ORDER = ['nouvelle-lune', 'pleine-lune', 'eclipse-lunaire', 'eclipse-solaire'];

function icone(key: string) {
  if (key === 'nouvelle-lune') return <MoonPhase phase={0} size={44} />;
  if (key === 'pleine-lune') return <MoonPhase phase={0.5} size={44} />;
  if (key === 'eclipse-lunaire') return <EclipseIcon kind="lunar" size={44} />;
  if (key === 'eclipse-solaire') return <EclipseIcon kind="solar" size={44} />;
  return null;
}

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

export default function SkyCountdown({ events, personnalisations }: { events: SkyEvent[]; personnalisations?: Record<string, string> }) {
  const [now, setNow] = useState<number | null>(null);
  const locale = useLocale();
  const t = useTranslations('SkyEvents');

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ordered = DISPLAY_ORDER.map((key) => events.find((e) => e.key === key)).filter((e): e is SkyEvent => Boolean(e));

  return (
    <div className="sky-countdown" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(150px, 210px))', gap: 12, justifyContent: 'center' }}>
      {ordered.map((e) => {
        const target = new Date(e.dateISO).getTime();
        const remaining = now !== null ? splitRemaining(target - now) : null;
        const dateLabel = new Date(e.dateISO).toLocaleDateString(dateLocaleTag(locale), {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
        const messageKey = KEY_TO_MESSAGE[e.key];

        const impact = personnalisations?.[e.key];

        return (
          <div key={e.key} className="card" style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left', boxShadow: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flexShrink: 0 }}>{icone(e.key)}</div>
              <div style={{ minWidth: 0 }}>
                <div className="field-label" style={{ marginBottom: 4, fontSize: '0.66rem' }}>{messageKey ? t(messageKey) : e.label}</div>
                <div className="mono" style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--lever-profond)', minHeight: '1.3em' }}>
                  {remaining ? (remaining.passed ? t('now') : `${remaining.j}j ${pad(remaining.h)}h ${pad(remaining.m)}m ${pad(remaining.s)}s`) : '—'}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--sourdine)', marginTop: 2 }}>{dateLabel}</div>
              </div>
            </div>
            {impact && (
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--ombre)', fontStyle: 'italic', borderTop: '1px solid var(--trait)', paddingTop: 8 }}>
                {impact}
              </p>
            )}
          </div>
        );
      })}
      <style>{`
        @media (max-width: 420px){ .sky-countdown{ grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
