'use client';

import { useState } from 'react';
import { FEATURE_COSTS, FEATURE_LABELS, FeatureKey } from '@/lib/pricing';
import { SIGNS } from '@/lib/zodiac';
import ReadingCard, { type Reading } from '@/components/ReadingCard';
import AstralChartCard, { type AstralChart } from '@/components/AstralChartCard';
import SentimentCard from '@/components/SentimentCard';
import CompatibilityCard from '@/components/CompatibilityCard';
import GrandeAnalyseCard from '@/components/GrandeAnalyseCard';
import EmptyStateIllustration from '@/components/EmptyStateIllustration';
import { SignCircle } from '@/components/CardParts';
import type { SentimentReading, CompatibilityReading, GrandeAnalyse } from '@/lib/anthropic';

const FEATURE_ORDER = Object.keys(FEATURE_COSTS) as FeatureKey[];

type UserSign = { key: string; nom: string; symbole: string; dates: string };
type ResultSignInfo = { nom: string; symbole: string; dates: string; element?: string; planete?: string };
type CompatReading = CompatibilityReading & { autreSigne: { key: string; nom: string; symbole: string } };

export default function Dashboard({
  userName,
  userSign,
  initialBalance,
  balanceError,
}: {
  userName: string;
  userSign: UserSign;
  initialBalance: number;
  balanceError: string | null;
}) {
  const [feature, setFeature] = useState<FeatureKey>('horoscope_quotidien');
  const [balance, setBalance] = useState(initialBalance);
  const [reading, setReading] = useState<Reading | null>(null);
  const [chart, setChart] = useState<AstralChart | null>(null);
  const [sentiment, setSentiment] = useState<SentimentReading | null>(null);
  const [compat, setCompat] = useState<CompatReading | null>(null);
  const [grandeAnalyse, setGrandeAnalyse] = useState<GrandeAnalyse | null>(null);
  const [signInfo, setSignInfo] = useState<ResultSignInfo | null>(null);
  const [autreSigneKey, setAutreSigneKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cost = FEATURE_COSTS[feature];
  const needsAutreSigne = feature === 'compatibilite_amoureuse';
  const canGenerate = !needsAutreSigne || Boolean(autreSigneKey);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(needsAutreSigne ? { feature, autreSigne: autreSigneKey } : { feature }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue.');
        setLoading(false);
        return;
      }
      setReading(null);
      setChart(null);
      setSentiment(null);
      setCompat(null);
      setGrandeAnalyse(null);
      if (feature === 'theme_astral_complet') setChart(data.reading);
      else if (feature === 'analyse_sentimentale') setSentiment(data.reading);
      else if (feature === 'compatibilite_amoureuse') setCompat(data.reading);
      else if (feature === 'grande_analyse') setGrandeAnalyse(data.reading);
      else setReading(data.reading);
      setSignInfo(data.sign);
      setBalance(data.balance);
    } catch {
      setError('Erreur réseau, réessaie.');
    } finally {
      setLoading(false);
    }
  }

  const hasResult = reading || chart || sentiment || compat || grandeAnalyse;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem' }}>Bonjour</h1>
          <p style={{ color: 'var(--ombre)', fontSize: '0.9rem' }}>{userName}</p>
        </div>
        <div className="card" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--ombre)' }}>Solde</span>
          <span className="mono" style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--lever-profond)' }}>{balance}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--ombre)' }}>crédits</span>
          <a href="/tarifs" className="btn btn-ghost" style={{ padding: '7px 14px', fontSize: '0.78rem' }}>+ Ajouter</a>
        </div>
      </div>

      <a href="/app/historique" style={{ display: 'inline-block', fontSize: '0.82rem', color: 'var(--ombre)', textDecoration: 'underline', marginBottom: 24 }}>
        Voir l'historique de mes lectures
      </a>

      {balanceError && (
        <div className="card" style={{ padding: '14px 18px', marginBottom: 24, borderColor: 'var(--lever)', color: 'var(--lever-profond)', fontSize: '0.86rem' }}>
          {balanceError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 32 }} className="dash-grid">
        <div>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>Votre signe</h2>
          <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, boxShadow: 'none' }}>
            <SignCircle symbole={userSign.symbole} size={40} fontSize="1.2rem" />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{userSign.nom}</div>
              <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--sourdine)' }}>{userSign.dates}</div>
            </div>
            <a href="/app/profil" style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--ombre)', textDecoration: 'underline', whiteSpace: 'nowrap' }}>
              Modifier
            </a>
          </div>

          <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>Type de lecture</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {FEATURE_ORDER.map((key) => {
              const meta = FEATURE_LABELS[key];
              const active = key === feature;
              return (
                <button
                  key={key}
                  disabled={!meta.disponible}
                  onClick={() => setFeature(key)}
                  aria-pressed={active}
                  className="card pick-btn"
                  style={{
                    textAlign: 'left',
                    padding: '14px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    cursor: meta.disponible ? 'pointer' : 'not-allowed',
                    opacity: meta.disponible ? 1 : 0.5,
                    borderColor: active ? 'var(--lever)' : 'var(--trait)',
                    boxShadow: 'none',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{meta.nom}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--sourdine)' }}>
                      {meta.disponible ? meta.description : `${meta.description} — bientôt disponible`}
                    </div>
                  </div>
                  <span className="mono" style={{ fontSize: '0.82rem', color: 'var(--lever-profond)', whiteSpace: 'nowrap' }}>
                    {FEATURE_COSTS[key]} cr.
                  </span>
                </button>
              );
            })}
          </div>

          {feature === 'horoscope_personnalise' && (
            <div className="card" style={{ padding: '12px 16px', marginBottom: 24, boxShadow: 'none', fontSize: '0.84rem', color: 'var(--ombre)' }}>
              Basée sur l'heure et le lieu de naissance de votre profil.
            </div>
          )}

          {feature === 'theme_astral_complet' && (
            <div className="card" style={{ padding: '12px 16px', marginBottom: 24, boxShadow: 'none', fontSize: '0.84rem', color: 'var(--ombre)' }}>
              Un portrait de fond basé sur votre profil — pas une lecture du jour, vous pouvez le régénérer quand vous voulez.
            </div>
          )}

          {feature === 'analyse_sentimentale' && (
            <div className="card" style={{ padding: '12px 16px', marginBottom: 24, boxShadow: 'none', fontSize: '0.84rem', color: 'var(--ombre)' }}>
              Portée d'une semaine entière — stable si vous la régénérez plusieurs fois cette semaine.
            </div>
          )}

          {feature === 'grande_analyse' && (
            <div className="card" style={{ padding: '12px 16px', marginBottom: 24, boxShadow: 'none', fontSize: '0.84rem', color: 'var(--ombre)' }}>
              Le bilan le plus complet : amour, carrière, finances, santé, famille et évolution personnelle.
            </div>
          )}

          {needsAutreSigne && (
            <div className="card" style={{ padding: '14px 16px', marginBottom: 24, boxShadow: 'none' }}>
              <div className="field-label" style={{ marginBottom: 10 }}>Comparer votre signe à</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {SIGNS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setAutreSigneKey(s.key)}
                    aria-pressed={autreSigneKey === s.key}
                    className="pick-btn"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      padding: '8px 4px',
                      borderRadius: 10,
                      border: `1px solid ${autreSigneKey === s.key ? 'var(--lever)' : 'var(--trait)'}`,
                      background: autreSigneKey === s.key ? 'var(--brume)' : 'transparent',
                      color: 'var(--ombre)',
                      fontSize: '0.6rem',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: '1.1rem', color: autreSigneKey === s.key ? 'var(--lever-profond)' : 'var(--sourdine)' }}>{s.symbole}</span>
                    {s.nom}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={generate}
            disabled={loading || balance < cost || !canGenerate}
            className={`btn btn-primary${loading ? ' btn-loading' : ''}`}
            style={{ width: '100%' }}
          >
            {loading
              ? 'Lecture en cours…'
              : balance < cost
              ? `Crédits insuffisants (${balance}/${cost})`
              : !canGenerate
              ? 'Choisissez un second signe'
              : `Générer (${cost} crédit${cost > 1 ? 's' : ''})`}
          </button>
          {error && (
            <p style={{ fontSize: '0.84rem', color: 'var(--lever-profond)', marginTop: 10 }}>
              {error} {error.toLowerCase().includes('crédit') && <a href="/tarifs" style={{ textDecoration: 'underline' }}>Voir les forfaits</a>}
            </p>
          )}
        </div>

        <div>
          {!hasResult && (
            <div className="card" style={{ padding: '40px 26px', textAlign: 'center', color: 'var(--sourdine)' }}>
              <EmptyStateIllustration size={72} />
              <p style={{ margin: '14px 0 0' }}>Choisissez une lecture, votre horoscope apparaîtra ici.</p>
            </div>
          )}

          {reading && signInfo && <ReadingCard reading={reading} signInfo={signInfo} />}
          {chart && signInfo && <AstralChartCard chart={chart} signInfo={signInfo} />}
          {sentiment && signInfo && <SentimentCard reading={sentiment} signInfo={signInfo} />}
          {compat && signInfo && <CompatibilityCard reading={compat} signInfo={signInfo} autreSigne={compat.autreSigne} />}
          {grandeAnalyse && signInfo && <GrandeAnalyseCard reading={grandeAnalyse} signInfo={signInfo} />}
        </div>
      </div>

      <style>{`
        .dash-grid > *{ min-width: 0; }
        @media (max-width: 860px){ .dash-grid{ grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
