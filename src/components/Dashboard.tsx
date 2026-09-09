'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { FEATURE_COSTS, FEATURE_LABELS, FEATURE_CATEGORIES, FeatureCategory, FeatureKey } from '@/lib/pricing';
import { THEMES, type ThemeKey } from '@/lib/themes';
import { extraitAPartager } from '@/lib/shareTeaser';
import ReadingCard, { type Reading } from '@/components/ReadingCard';
import AstralChartCard, { type AstralChart } from '@/components/AstralChartCard';
import SentimentCard from '@/components/SentimentCard';
import CompatibilityCard from '@/components/CompatibilityCard';
import GrandeAnalyseCard from '@/components/GrandeAnalyseCard';
import ThematicCard from '@/components/ThematicCard';
import LunarCycleCard from '@/components/LunarCycleCard';
import TransitsCard from '@/components/TransitsCard';
import EmptyStateIllustration from '@/components/EmptyStateIllustration';
import ShareButton from '@/components/ShareButton';
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
  shareLink,
  initialGeneratedToday,
}: {
  userName: string;
  userSign: UserSign;
  ascendant?: { nom: string; symbole: string } | null;
  initialBalance: number;
  balanceError: string | null;
  hasSubscription: boolean;
  shareLink: string;
  initialGeneratedToday: FeatureKey[];
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
  // Une seule génération à la fois, identifiée par lecture plutôt qu'un
  // simple booléen — chaque lecture porte maintenant son propre bouton
  // (retour utilisateur : "mets le bouton sur chaque lecture"), il faut donc
  // savoir PRÉCISÉMENT laquelle est en cours pour ne griser que celle-là.
  const [loadingFeature, setLoadingFeature] = useState<FeatureKey | null>(null);
  const [generatedToday, setGeneratedToday] = useState<Set<FeatureKey>>(new Set(initialGeneratedToday));
  const [error, setError] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  // Lectures avec des champs à renseigner (aujourd'hui : la compatibilité
  // amoureuse) — la saisie se fait dans sa propre popup, comme le résultat,
  // plutôt que dans une carte plantée en permanence dans la colonne.
  const [showCompatModal, setShowCompatModal] = useState(false);
  const locale = useLocale();
  const t = useTranslations('Dashboard');
  const tp = useTranslations('Pricing');

  const featureLocked = Boolean(FEATURE_LABELS[feature].subscriptionOnly) && !hasSubscription;
  const canGenerateCompat = Boolean(autrePrenom.trim()) && Boolean(autreDateNaissance);
  const compatCost = FEATURE_COSTS.compatibilite_amoureuse;

  async function generate(targetFeature: FeatureKey, confirmerRegeneration = false): Promise<boolean> {
    // Retour testeur (09/09) : un double-clic (notamment sur mobile, où le
    // bouton peut recevoir un deuxième tap avant que React n'applique
    // `disabled`) a déjà fait payer deux fois la même lecture — le bouton
    // seul ne suffit pas comme garde-fou, on bloque aussi ici. L'appel de
    // reconfirmation (voir plus bas) passe outre volontairement : il
    // survient alors qu'une génération est déjà "en cours" depuis le
    // premier appel.
    if (!confirmerRegeneration && loadingFeature) return false;
    const needsAutre = targetFeature === 'compatibilite_amoureuse';
    setFeature(targetFeature);
    setLoadingFeature(targetFeature);
    setError(null);

    let res: Response;
    let data: { reading?: unknown; sign?: ResultSignInfo; balance?: number; error?: string; code?: string };
    try {
      res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          needsAutre
            ? { feature: targetFeature, autrePrenom, autreDateNaissance, locale, confirmerRegeneration }
            : { feature: targetFeature, locale, confirmerRegeneration }
        ),
      });
      data = await res.json();
    } catch {
      setError(t('networkError'));
      setLoadingFeature(null);
      return false;
    }

    if (!res.ok) {
      // Lecture déjà générée aujourd'hui : plutôt qu'un blocage sec, on
      // demande confirmation avant de vraiment consommer des crédits une
      // deuxième fois pour un contenu qui a peu de chances d'avoir changé.
      // Pas de finally ici : setLoadingFeature ne doit surtout pas être
      // effacé pendant que l'appel de reconfirmation ci-dessous est en vol.
      if (data.code === 'ALREADY_GENERATED_TODAY' && !confirmerRegeneration) {
        if (window.confirm(data.error)) {
          return generate(targetFeature, true);
        }
        setLoadingFeature(null);
        return false;
      }
      setError(data.error || t('genericError'));
      setLoadingFeature(null);
      return false;
    }

    setReading(null);
    setChart(null);
    setSentiment(null);
    setCompat(null);
    setGrandeAnalyse(null);
    setThematic(null);
    setLunar(null);
    setTransits(null);
    if (targetFeature === 'theme_astral_complet') setChart(data.reading as AstralChart);
    else if (targetFeature === 'analyse_sentimentale') setSentiment(data.reading as SentimentReading);
    else if (targetFeature === 'compatibilite_amoureuse') setCompat(data.reading as CompatReading);
    else if (targetFeature === 'grande_analyse') setGrandeAnalyse(data.reading as GrandeAnalyse);
    else if (targetFeature === 'cycle_lunaire') setLunar(data.reading as LunarCycleReading);
    else if (targetFeature === 'transits_planetaires') setTransits(data.reading as TransitsReading);
    else if (isThemeKey(targetFeature)) setThematic(data.reading as ThematicReading);
    else setReading(data.reading as Reading);
    setSignInfo(data.sign ?? null);
    setBalance(data.balance ?? 0);
    setGeneratedToday((prev) => {
      const next = new Set(prev);
      next.add(targetFeature);
      return next;
    });
    setLoadingFeature(null);
    setShowCompatModal(false);
    // Retour testeur (09/09) : le résultat apparaît dans la colonne de
    // droite, hors champ sur mobile — sans indice qu'il est arrivé, on
    // clique une seconde fois sur "Générer" en pensant que rien ne s'est
    // passé (et on paie deux fois). Affiché d'abord dans une mini popup,
    // impossible à manquer quelle que soit la position de défilement.
    setShowPopup(true);
    return true;
  }

  const hasResult = reading || chart || sentiment || compat || grandeAnalyse || thematic || lunar || transits;

  // Partage sur les réseaux — jamais la lecture complète (réservée aux
  // personnes inscrites/abonnées), voir lib/shareTeaser.ts. Le lien pointe
  // vers le parrainage existant (lib/referral.ts) : la personne qui partage
  // touche ses crédits de parrain si ça se transforme en inscription.
  const extraitResultat = (() => {
    if (compat) return extraitAPartager(feature, compat);
    if (reading) return extraitAPartager(feature, reading);
    if (sentiment) return extraitAPartager(feature, sentiment);
    if (grandeAnalyse) return extraitAPartager(feature, grandeAnalyse);
    if (thematic) return extraitAPartager(feature, thematic);
    if (lunar) return extraitAPartager(feature, lunar);
    if (transits) return extraitAPartager(feature, transits);
    if (chart) return extraitAPartager(feature, chart);
    return null;
  })();
  const texteAPartager = extraitResultat
    ? t('shareTextWithHighlight', { highlight: extraitResultat.length > 140 ? `${extraitResultat.slice(0, 140)}…` : extraitResultat })
    : t('shareTextFallback');

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
      {hasResult && (
        <ShareButton
          shareText={texteAPartager}
          shareUrl={shareLink}
          title={t('shareTitle')}
          subtitle={t('shareSubtitle')}
          label={t('shareButton')}
          copiedLabel={t('shareCopied')}
        />
      )}
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

      {error && (
        <div className="card" style={{ padding: '14px 18px', marginBottom: 24, borderColor: 'var(--lever)', color: 'var(--lever-profond)', fontSize: '0.86rem' }}>
          {error} {(error.toLowerCase().includes('crédit') || error.toLowerCase().includes('credit') || error.toLowerCase().includes('abonnement') || error.toLowerCase().includes('subscription')) && <Link href="/tarifs" style={{ textDecoration: 'underline' }}>{t('viewPackages')}</Link>}
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
                  const dejaFaitAujourdhui = generatedToday.has(key);
                  const enCours = loadingFeature === key;
                  const insuffisant = balance < FEATURE_COSTS[key];

                  return (
                    <div
                      key={key}
                      role="button"
                      tabIndex={meta.disponible ? 0 : -1}
                      onClick={() => meta.disponible && setFeature(key)}
                      onKeyDown={(e) => {
                        if (meta.disponible && (e.key === 'Enter' || e.key === ' ')) setFeature(key);
                      }}
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

                      {!meta.disponible || locked ? (
                        <span className="mono" style={{ fontSize: '0.82rem', color: 'var(--lever-profond)', whiteSpace: 'nowrap' }}>
                          {FEATURE_COSTS[key]} {tp('creditUnit')}
                        </span>
                      ) : insuffisant ? (
                        // Retour utilisateur : un bouton grisé et inerte n'aide
                        // personne — quand le solde ne suffit pas, on mène
                        // directement vers la page d'achat plutôt que de
                        // bloquer sans rien proposer.
                        <Link
                          href="/tarifs"
                          onClick={(e) => e.stopPropagation()}
                          className="btn btn-ghost"
                          style={{ padding: '6px 14px', fontSize: '0.76rem', whiteSpace: 'nowrap' }}
                        >
                          {t('insufficientCreditsShort')}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (key === 'compatibilite_amoureuse') {
                              setFeature(key);
                              setShowCompatModal(true);
                            } else {
                              void generate(key);
                            }
                          }}
                          disabled={enCours}
                          className="btn btn-ghost"
                          style={{
                            padding: '6px 14px',
                            fontSize: '0.76rem',
                            whiteSpace: 'nowrap',
                            opacity: dejaFaitAujourdhui ? 0.6 : 1,
                            cursor: enCours ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {enCours
                            ? t('generating')
                            : dejaFaitAujourdhui
                            ? t('generatedTodayBadge')
                            : t('generateRowButton', { cost: FEATURE_COSTS[key] })}
                        </button>
                      )}
                    </div>
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

      {showCompatModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowCompatModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px 16px',
            overflowY: 'auto',
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{ position: 'relative', width: '100%', maxWidth: 420, padding: '26px 24px' }}
          >
            <button
              onClick={() => setShowCompatModal(false)}
              aria-label={t('closePopup')}
              className="btn btn-ghost"
              style={{ position: 'absolute', top: -14, right: -14, width: 36, height: 36, padding: 0, borderRadius: '50%' }}
            >
              ✕
            </button>

            <div className="field-label" style={{ marginBottom: -4 }}>{t('compareYourSignTo')}</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--sourdine)', margin: '8px 0 16px' }}>{t('compareYourSignToHelp')}</p>

            <div style={{ marginBottom: 12 }}>
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
            <div style={{ marginBottom: 18 }}>
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

            {balance < compatCost ? (
              <Link href="/tarifs" className="btn btn-primary" style={{ width: '100%', textAlign: 'center' }}>
                {t('insufficientCreditsShort')}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => void generate('compatibilite_amoureuse')}
                disabled={loadingFeature === 'compatibilite_amoureuse' || !canGenerateCompat}
                className={`btn btn-primary${loadingFeature === 'compatibilite_amoureuse' ? ' btn-loading' : ''}`}
                style={{ width: '100%' }}
              >
                {loadingFeature === 'compatibilite_amoureuse'
                  ? t('generating')
                  : !canGenerateCompat
                  ? t('fillNameAndDate')
                  : t('generate', { cost: compatCost })}
              </button>
            )}
          </div>
        </div>
      )}

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
