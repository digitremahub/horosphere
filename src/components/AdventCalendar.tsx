'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

type Statut = { actif: boolean; jourDuJour: number; joursReclames: number[] };

const JOURS = Array.from({ length: 24 }, (_, i) => i + 1);

export default function AdventCalendar() {
  const t = useTranslations('Advent');
  const [statut, setStatut] = useState<Statut | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/advent')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setStatut(data);
      })
      .catch(() => setError(t('claimError')));
  }, [t]);

  async function reclamer() {
    setClaiming(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/advent', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('claimError'));
        return;
      }
      setMessage(t('claimSuccess', { credits: data.credits }));
      setStatut((prev) => (prev ? { ...prev, joursReclames: [...prev.joursReclames, data.jour] } : prev));
    } catch {
      setError(t('claimError'));
    } finally {
      setClaiming(false);
    }
  }

  if (error && !statut) {
    return <p style={{ color: 'var(--sourdine)' }}>{error}</p>;
  }
  if (!statut) {
    return null;
  }
  if (!statut.actif) {
    return (
      <div className="card" style={{ padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ margin: 0 }}>{t('offSeason')}</p>
      </div>
    );
  }

  const dejaReclameAujourdhui = statut.joursReclames.includes(statut.jourDuJour);

  return (
    <div>
      {message && (
        <div className="pill" style={{ marginBottom: 16, borderColor: 'var(--sauge)', color: 'var(--sauge)' }}>
          {message}
        </div>
      )}
      {error && (
        <div className="pill" style={{ marginBottom: 16, borderColor: 'var(--lever-profond)', color: 'var(--lever-profond)' }}>
          {error}
        </div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
          gap: 12,
        }}
      >
        {JOURS.map((jour) => {
          const reclame = statut.joursReclames.includes(jour);
          const estAujourdhui = jour === statut.jourDuJour;
          const manque = jour < statut.jourDuJour && !reclame;
          const verrouille = jour > statut.jourDuJour;

          return (
            <div
              key={jour}
              className="card"
              style={{
                padding: '16px 10px',
                textAlign: 'center',
                opacity: verrouille || manque ? 0.5 : 1,
                borderColor: estAujourdhui && !reclame ? 'var(--ambre)' : undefined,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{t('day', { day: jour })}</div>
              {estAujourdhui && !dejaReclameAujourdhui ? (
                <button type="button" className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.78rem' }} onClick={reclamer} disabled={claiming}>
                  {claiming ? t('claiming') : t('claim')}
                </button>
              ) : reclame ? (
                <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--sauge)' }}>✓</span>
              ) : manque ? (
                <span style={{ fontSize: '0.78rem', color: 'var(--sourdine)' }}>{t('missed')}</span>
              ) : (
                <span style={{ fontSize: '0.78rem', color: 'var(--sourdine)' }}>{t('locked')}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
