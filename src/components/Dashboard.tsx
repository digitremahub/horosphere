'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
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
type CompatReading = CompatibilityReading & { autreSigne: { key: string; nom: string; symbole: string; prenom?: string }; moiPrenom?: string };

export default function Dashboard({
  userName,
  userSign,
  ascendant,
  initialBalance,
  balanceError,
  hasSubscription,
}: {
  userName: string;
  userSign: UserSign;
  ascendant?: { nom: string; symbole: string } | null;
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
  const [showPopup, setShowPopup] = useState(false);
  const locale = useLocale();
  const t = useTranslations('Dashboard');
  const tp = useTranslations('Pricing');

  const cost = FEATURE_COSTS[feature];
  const needsAutrePersonne = feature === 'compatibilite_amoureuse';
  const canGenerate = !needsAutrePersonne || (Boolean(autrePrenom.trim()) && Boolean(autreDateNaissance));
  const featureLocked = Boolean(FEATURE_LABELS[feature].subscriptionOnly) && !hasSubscription;

  async function generate(confirmerRegeneration = false) {
    // Retour testeur (09/09) : un double-clic (notamment sur mobile, où le
    // bouton peut recevoir un deuxième tap avant que React n'applique
    // `disabled`) a déjà fait payer deux fois la même lecture — le bouton
    // seul ne suffit pas comme garde-fou, on bloque aussi ici. L'appel de
    // reconfirmation (voir plus bas) passe outre volontairement : il
    // survient alors que `loading` est déjà à true depuis le premier appel.
    if (!confirmerRegeneration && loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          needsAutrePersonne
            ? { feature, autrePrenom, autreDateNaissance, locale, confirmerRegeneration }
            : { feature, locale, confirmerRegeneration }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        // Lecture déjà générée aujourd'hui : plutôt qu'un blocage sec, on
        // demande confirmation avant de vraiment consommer des crédits une
        // deuxième fois pour un contenu qui a peu de chances d'avoir changé.
        if (data.code === 'ALREADY_GENERATED_TODAY' && !confirmerRegeneration) {
          if (window.confirm(data.error)) {
            await generate(true);
          } else {
            setLoading(false);
          }
          return;
        }
        setError(data.error || t('genericError'));
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
      // Retour testeur (09/09) : le résultat apparaît dans la colonne de
      // droite, hors champ sur mobile — sans indice qu'il est arrivé, on
      // clique une seconde fois sur "Générer" en pensant que rien ne s'est
      // passé (et on paie deux fois). Affiché d'abord dans une mini popup,
      // impossible à manquer quelle que soit la position de défilement.
      setShowPopup(true);
    } catch {
      setError(t('networkError'));
    } finally {
      setLoading(false);
    }
  }

  const hasResult = reading || chart || sentiment || compat || grandeAnalyse || thematic || lunar || transits;

  useEffect(() => {
    if (!showPopup) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowPopup(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showPopup]);

  const resultCards = (
    <>
      {reading && signInfo && <ReadingCard reading={reading} signInfo={signInfo} />}
      {chart && signInfo && <AstralChartCard chart={chart} signInfo={signInfo} />}
      {sentiment && signInfo && <SentimentCard reading={sentiment} signInfo={signInfo} />}
      {compat && signInfo && <CompatibilityCard reading={compat} signInfo={signInfo} autreSigne={compat.autreSigne} moiPrenom={compat.moiPrenom} />}
      {grandeAnalyse && signInfo && <GrandeAnalyseCard reading={grandeAnalyse} signInfo={signInfo} />}
      {thematic && signInfo && isThemeKey(feature) && <ThematicCard reading={thematic} signInfo={signInfo} featureNom={tp(`features.${feature}.nom`)} />}
      {lunar && signInfo && <LunarCycleCard reading={lunar} signInfo={signInfo} />}
      {transits && signInfo && <TransitsCard reading={transits} signInfo={signInfo} />}
    </>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem' }}>{t('greeting')}</h1>
          <p style={{ color: 'var(--ombre)', fontSize: '0.9rem' }}>{userName}</p>
        </div>
        <div className="card" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--ombre)' }}>{t('balance')}</span>
          <span className="mono" style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--lever-profond)' }}>{balance}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--ombre)' }}>{t('credits')}</span>
          <Link href="/tarifs" className="btn btn-ghost" style={{ padding: '7px 14px', fontSize: '0.78rem' }}>{t('addCredits')}</Link>
        </div>
      </div>

      <Link href="/app/historique" style={{ display: 'inline-block', fontSize: '0.82rem', color: 'var(--ombre)', textDecoration: 'underline', marginBottom: 24 }}>
        {t('viewHistory')}
      </Link>

      {balanceError && (
        <div className="card" style={{ padding: '14px 18px', marginBottom: 24, borderColor: 'var(--lever)', color: 'var(--lever-profond)', fontSize: '0.86rem' }}>
          {balanceError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 32 }} className="dash-grid">
        <div>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>{t('yourSign')}</h2>
          <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, boxShadow: 'none' }}>
            <SignCircle symbole={userSign.symbole} size={40} fontSize="1.2rem" />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{userSign.nom}</div>
              <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--sourdine)' }}>{userSign.dates}</div>
            </div>
            {ascendant && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 12, marginLeft: 4, borderLeft: '1px solid var(--trait)' }}>
                <span style={{ fontSize: '1.3rem' }}>{ascendant.symbole}</span>
                <div>
                  <div className="mono" style={{ fontSize: '0.62rem', color: 'var(--sourdine)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('ascendant')}</div>
                  <div style={{ fontWeight: 600, fontSize: '0.86rem' }}>{ascendant.nom}</div>
                </div>
              </div>
            )}
            <Link href="/app/profil" style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--ombre)', textDecoration: 'underline', whiteSpace: 'nowrap' }}>
              {t('edit')}
            </Link>
          </div>
          {!ascendant && (
            <p style={{ fontSize: '0.78rem', color: 'var(--sourdine)', marginTop: -16, marginBottom: 24 }}>
              {t.rich('addBirthTime', {
                link: (chunks) => <Link href="/app/profil" style={{ color: 'var(--lever-profond)' }}>{chunks}</Link>,
              })}
            </p>
          )}

          {CATEGORY_ORDER.map((cat) => (
            <div key={cat}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>{tp(`categories.${cat}`)}</h2>
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
                          <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{tp(`features.${key}.nom`)}</span>
                          {locked && (
                            <span className="pill" style={{ padding: '2px 8px', fontSize: '0.62rem', borderColor: 'var(--ambre)', color: 'var(--ambre)' }}>
                              {t('locked')}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--sourdine)' }}>
                          {meta.disponible ? tp(`features.${key}.description`) : t('descriptionComingSoon', { description: tp(`features.${key}.description`) })}
                        </div>
                      </div>
                      <span className="mono" style={{ fontSize: '0.82rem', color: 'var(--lever-profond)', whiteSpace: 'nowrap' }}>
                        {FEATURE_COSTS[key]} {tp('creditUnit')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {feature === 'horoscope_personnalise' && (
            <div className="card" style={{ padding: '12px 16px', marginBottom: 24, boxShadow: 'none', fontSize: '0.84rem', color: 'var(--ombre)' }}>
              {t('infoPersonalise')}
            </div>
          )}

          {feature === 'theme_astral_complet' && (
            <div className="card" style={{ padding: '12px 16px', marginBottom: 24, boxShadow: 'none', fontSize: '0.84rem', color: 'var(--ombre)' }}>
              {t('infoThemeAstral')}
            </div>
          )}

          {feature === 'analyse_sentimentale' && (
            <div className="card" style={{ padding: '12px 16px', marginBottom: 24, boxShadow: 'none', fontSize: '0.84rem', color: 'var(--ombre)' }}>
              {t('infoSentimentale')}
            </div>
          )}

          {feature === 'grande_analyse' && (
            <div className="card" style={{ padding: '12px 16px', marginBottom: 24, boxShadow: 'none', fontSize: '0.84rem', color: 'var(--ombre)' }}>
              {t('infoGrandeAnalyse')}
            </div>
          )}

          {(feature === 'cycle_lunaire' || feature === 'transits_planetaires') && (
            <div className="card" style={{ padding: '12px 16px', marginBottom: 24, boxShadow: 'none', fontSize: '0.84rem', color: 'var(--ombre)' }}>
              {t('infoPosition', { what: feature === 'cycle_lunaire' ? t('theMoon') : t('thePlanets') })}
            </div>
          )}

          {featureLocked && (
            <div className="card" style={{ padding: '14px 16px', marginBottom: 24, boxShadow: 'none', borderColor: 'var(--ambre)' }}>
              <p style={{ margin: '0 0 10px', fontSize: '0.86rem', color: 'var(--ombre)' }}>
                {t('lockedTitle')}
              </p>
              <Link href="/tarifs" className="btn btn-primary" style={{ padding: '9px 18px', fontSize: '0.82rem' }}>{t('viewSubscriptions')}</Link>
            </div>
          )}

          {needsAutrePersonne && !featureLocked && (
            <div className="card" style={{ padding: '14px 16px', marginBottom: 24, boxShadow: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field-label" style={{ marginBottom: -4 }}>{t('compareYourSignTo')}</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--sourdine)', margin: 0 }}>{t('compareYourSignToHelp')}</p>
              <div>
                <label htmlFor="autre-prenom" style={{ fontSize: '0.76rem', color: 'var(--sourdine)', display: 'block', marginBottom: 4 }}>{t('firstName')}</label>
                <input
                  id="autre-prenom"
                  type="text"
                  value={autrePrenom}
                  onChange={(e) => setAutrePrenom(e.target.value)}
                  placeholder={t('firstNamePlaceholder')}
                  style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--trait)', background: 'var(--nacre)', color: 'var(--encre)', fontSize: '0.9rem', width: '100%' }}
                />
              </div>
              <div>
                <label htmlFor="autre-date" style={{ fontSize: '0.76rem', color: 'var(--sourdine)', display: 'block', marginBottom: 4 }}>{t('birthDate')}</label>
                <input
                  id="autre-date"
                  type="date"
                  value={autreDateNaissance}
                  onChange={(e) => setAutreDateNaissance(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--trait)', background: 'var(--nacre)', color: 'var(--encre)', fontSize: '0.9rem', width: '100%' }}
                />
              </div>
            </div>
          )}

          {!featureLocked && (
            <>
              <button
                onClick={() => generate()}
                disabled={loading || balance < cost || !canGenerate}
                className={`btn btn-primary${loading ? ' btn-loading' : ''}`}
                style={{ width: '100%' }}
              >
                {loading
                  ? t('generating')
                  : balance < cost
                  ? t('insufficientCredits', { balance, cost })
                  : t('generate', { cost })}
              </button>
              {/* Retour testeur : le bouton affichait "Renseignez le prénom et
                  la date de naissance" à la PLACE de "Générer" tant que les
                  champs n'étaient pas remplis — contrairement aux autres
                  lectures, cette lecture-ci ne montrait donc jamais le mot
                  "Générer", ce qui a fait croire qu'il manquait un bouton.
                  Le bouton garde maintenant son texte habituel (grisé), et
                  l'explication passe en dessous. */}
              {!loading && balance >= cost && !canGenerate && (
                <p style={{ fontSize: '0.82rem', color: 'var(--sourdine)', marginTop: 8 }}>
                  {t('fillNameAndDate')}
                </p>
              )}
            </>
          )}
          {error && (
            <p style={{ fontSize: '0.84rem', color: 'var(--lever-profond)', marginTop: 10 }}>
              {error} {(error.toLowerCase().includes('crédit') || error.toLowerCase().includes('credit') || error.toLowerCase().includes('abonnement') || error.toLowerCase().includes('subscription')) && <Link href="/tarifs" style={{ textDecoration: 'underline' }}>{t('viewPackages')}</Link>}
            </p>
          )}
        </div>

        <div>
          {!hasResult && (
            <div className="card" style={{ padding: '40px 26px', textAlign: 'center', color: 'var(--sourdine)' }}>
              <EmptyStateIllustration size={72} />
              <p style={{ margin: '14px 0 0' }}>{t('chooseReadingPlaceholder')}</p>
            </div>
          )}

          {resultCards}
        </div>
      </div>

      {showPopup && hasResult && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowPopup(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '40px 16px',
            overflowY: 'auto',
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative', width: '100%', maxWidth: 560, marginTop: 20 }}
          >
            <button
              onClick={() => setShowPopup(false)}
              aria-label={t('closePopup')}
              className="btn btn-ghost"
              style={{ position: 'absolute', top: -14, right: -14, width: 36, height: 36, padding: 0, borderRadius: '50%', zIndex: 1 }}
            >
              ✕
            </button>
            {resultCards}
          </div>
        </div>
      )}

      <style>{`
        .dash-grid > *{ min-width: 0; }
        @media (max-width: 860px){ .dash-grid{ grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
