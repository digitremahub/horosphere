'use client';

import { useState } from 'react';
import { FEATURE_COSTS, FEATURE_LABELS, FEATURE_CATEGORIES, FeatureCategory, FeatureKey } from '@/lib/pricing';
import { THEMES, type ThemeKey } from '@/lib/themes';
import ReadingCard, { type Reading } from '@/components/ReadingCard';
import AstralChartCard, { type AstralChart } from '@/components/AstralChartCard';
import SentimentCard from '@/components/SentimentCard';
import CompatibilityCard from '@/components/CompatibilityCard';
import GrandeAnalyseCard from '@/components/GrandeAnalyseCard';
import ThematicCard from '@/components/ThematicCard';
import LunarCycleCard from '@/components/LunarCycleCard';
import TransitsCard from '@/components/TransitsCard';
import EmptyStateIllustration from '@/components/EmptyStateIllustration';
import { SignCircle } from '@/components/CardParts';
import type { SentimentReading, CompatibilityReading, GrandeAnalyse, ThematicReading, LunarCycleReading, TransitsReading } from '@/lib/anthropic';

const FEATURE_ORDER = Object.keys(FEATURE_COSTS) as FeatureKey[];
const CATEGORY_ORDER: FeatureCategory[] = ['lectures', 'guidance'];
const THEME_KEYS = new Set(Object.keys(THEMES));
function isThemeKey(f: FeatureKey): f is FeatureKey & ThemeKey {
  return THEME_KEYS.has(f);
}

type UserSign = { key: string; nom: string; symbole: string; dates: string };
type ResultSignInfo = { nom: string; symbole: string; dates: string; element?: string; planete?: string };
type CompatReading = CompatibilityReading & { autreSigne: { key: string; nom: string; symbole: string; prenom?: string } };

export default function Dashboard({
  userName,
  userSign,
  initialBalance,
  balanceError,
  hasSubscription,
}: {
  userName: string;
  userSign: UserSign;
  initialBalance: number;
  balanceError: string | null;
  hasSubscription: boolean;
}) {
  const [feature, setFeature] = useState<FeatureKey>('horoscope_quotidien');
  const [balance, setBalance] = useState(initialBalance);
  const [reading, setReading] = useState<Reading | null>(null);
  const [chart, setChart] = useState<AstralChart | null>(null);
  const [sentiment, setSentiment] = useState<SentimentReading | null>(null);
  const [compat, setCompat] = useState<CompatReading | null>(null);
  const [grandeAnalyse, setGrandeAnalyse] = useState<GrandeAnalyse | null>(null);
  const [thematic, setThematic] = useState<ThematicReading | null>(null);
  const [lunar, setLunar] = useState<LunarCycleReading | null>(null);
  const [transits, setTransits] = useState<TransitsReading | null>(null);
  const [signInfo, setSignInfo] = useState<ResultSignInfo | null>(null);
  const [autrePrenom, setAutrePrenom] = useState('');
  const [autreDateNaissance, setAutreDateNaissance] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cost = FEATURE_COSTS[feature];
  const needsAutrePersonne = feature === 'compatibilite_amoureuse';
  const canGenerate = !needsAutrePersonne || (Boolean(autrePrenom.trim()) && Boolean(autreDateNaissance));
  const featureLocked = Boolean(FEATURE_LABELS[feature].subscriptionOnly) && !hasSubscription;

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(needsAutrePersonne ? { feature, autrePrenom, autreDateNaissance } : { feature }),
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
      setThematic(null);
      setLunar(null);
      setTransits(null);
      if (feature === 'theme_astral_complet') setChart(data.reading);
      else if (feature === 'analyse_sentimentale') setSentiment(data.reading);
      else if (feature === 'compatibilite_amoureuse') setCompat(data.reading);
      else if (feature === 'grande_analyse') setGrandeAnalyse(data.reading);
      else if (feature === 'cycle_lunaire') setLunar(data.reading);
      else if (feature === 'transits_planetaires') setTransits(data.reading);
      else if (isThemeKey(feature)) setThematic(data.reading);
      else setReading(data.reading);
      setSignInfo(data.sign);
      setBalance(data.balance);
    } catch {
      setError('Erreur réseau, réessaie.');
    } finally {
      setLoading(false);
    }
  }

  const hasResult = reading || chart || sentiment || compat || grandeAnalyse || thematic || lunar || transits;

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

          {CATEGORY_ORDER.map((cat) => (
            <div key={cat}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>{FEATURE_CATEGORIES[cat].titre}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {FEATURE_ORDER.filter((key) => FEATURE_LABELS[key].categorie === cat).map((key) => {
                  const meta = FEATURE_LABELS[key];
                  const active = key === feature;
                  const locked = Boolean(meta.subscriptionOnly) && !hasSubscription;
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{meta.nom}</span>
                          {locked && (
                            <span className="pill" style={{ padding: '2px 8px', fontSize: '0.62rem', borderColor: 'var(--ambre)', color: 'var(--ambre)' }}>
                              🔒 Forfait requis
                            </span>
                          )}
                        </div>
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
            </div>
          ))}

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

          {(feature === 'cycle_lunaire' || feature === 'transits_planetaires') && (
            <div className="card" style={{ padding: '12px 16px', marginBottom: 24, boxShadow: 'none', fontSize: '0.84rem', color: 'var(--ombre)' }}>
              Basée sur la position réelle {feature === 'cycle_lunaire' ? 'de la lune' : 'des planètes'} aujourd'hui, pas sur une estimation.
            </div>
          )}

          {featureLocked && (
            <div className="card" style={{ padding: '14px 16px', marginBottom: 24, boxShadow: 'none', borderColor: 'var(--ambre)' }}>
              <p style={{ margin: '0 0 10px', fontSize: '0.86rem', color: 'var(--ombre)' }}>
                Cette lecture est réservée aux abonnés — les crédits seuls ne suffisent pas ici.
              </p>
              <a href="/tarifs" className="btn btn-primary" style={{ padding: '9px 18px', fontSize: '0.82rem' }}>Voir les abonnements</a>
            </div>
          )}

          {needsAutrePersonne && !featureLocked && (
            <div className="card" style={{ padding: '14px 16px', marginBottom: 24, boxShadow: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field-label" style={{ marginBottom: -4 }}>Comparer votre signe à</div>
              <div>
                <label htmlFor="autre-prenom" style={{ fontSize: '0.76rem', color: 'var(--sourdine)', display: 'block', marginBottom: 4 }}>Prénom</label>
                <input
                  id="autre-prenom"
                  type="text"
                  value={autrePrenom}
                  onChange={(e) => setAutrePrenom(e.target.value)}
                  placeholder="Ex. Camille"
                  style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--trait)', background: 'var(--nacre)', color: 'var(--encre)', fontSize: '0.9rem', width: '100%' }}
                />
              </div>
              <div>
                <label htmlFor="autre-date" style={{ fontSize: '0.76rem', color: 'var(--sourdine)', display: 'block', marginBottom: 4 }}>Date de naissance</label>
                <input
                  id="autre-date"
                  type="date"
                  value={autreDateNaissance}
                  onChange={(e) => setAutreDateNaissance(e.target.value)}
                  style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--trait)', background: 'var(--nacre)', color: 'var(--encre)', fontSize: '0.9rem', width: '100%' }}
                />
              </div>
            </div>
          )}

          {!featureLocked && (
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
                ? 'Renseignez le prénom et la date de naissance'
                : `Générer (${cost} crédit${cost > 1 ? 's' : ''})`}
            </button>
          )}
          {error && (
            <p style={{ fontSize: '0.84rem', color: 'var(--lever-profond)', marginTop: 10 }}>
              {error} {(error.toLowerCase().includes('crédit') || error.toLowerCase().includes('abonnement')) && <a href="/tarifs" style={{ textDecoration: 'underline' }}>Voir les forfaits</a>}
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
          {thematic && signInfo && isThemeKey(feature) && <ThematicCard reading={thematic} signInfo={signInfo} featureNom={FEATURE_LABELS[feature].nom} />}
          {lunar && signInfo && <LunarCycleCard reading={lunar} signInfo={signInfo} />}
          {transits && signInfo && <TransitsCard reading={transits} signInfo={signInfo} />}
        </div>
      </div>

      <style>{`
        .dash-grid > *{ min-width: 0; }
        @media (max-width: 860px){ .dash-grid{ grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
