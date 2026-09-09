import { getLocale, getTranslations } from 'next-intl/server';
import { redirect, Link } from '@/i18n/navigation';
import { auth } from '@/lib/auth';
import { getHistory } from '@/lib/credits';
import { getProfile } from '@/lib/profile';
import { dbConfigured } from '@/lib/db';
import { FEATURE_LABELS, FeatureKey } from '@/lib/pricing';
import { THEMES } from '@/lib/themes';
import { findSign } from '@/lib/zodiac';
import { localizedSign } from '@/lib/zodiac-i18n';
import { dateLocaleTag } from '@/i18n/dateLocale';
import { lienParrainage } from '@/lib/referral';
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
import type { SentimentReading, CompatibilityReading, GrandeAnalyse, ThematicReading, LunarCycleReading, TransitsReading } from '@/lib/anthropic';

const THEME_KEYS = new Set(Object.keys(THEMES));

export default async function HistoriquePage() {
  const session = await auth();
  const locale = await getLocale();
  const th = await getTranslations('Historique');
  const tp = await getTranslations('Pricing');
  const td = await getTranslations('Dashboard');
  if (!session?.user) {
    redirect({ href: '/connexion', locale });
  }

  const userId = Number((session!.user as { id?: string }).id);
  const shareLink = lienParrainage(userId);

  // Profil de naissance obligatoire avant tout usage — voir /app/profil.
  if (dbConfigured) {
    let hasProfile = true;
    try {
      hasProfile = Boolean(await getProfile(userId));
    } catch {
      hasProfile = true; // erreur de lecture transitoire : ne pas bloquer l'accès
    }
    if (!hasProfile) {
      redirect({ href: '/app/profil', locale });
    }
  }

  let entries: Awaited<ReturnType<typeof getHistory>> = [];
  let error: string | null = null;

  if (dbConfigured) {
    try {
      entries = await getHistory(userId, 30);
    } catch {
      error = th('loadError');
    }
  } else {
    error = th('dbNotConnected');
  }

  return (
    <main style={{ paddingBottom: 96 }}>
      <div className="page-bandeau">
        <img
          src="/images/bg-resultat-lecture.png"
          alt="Un sextant tenu face au couchant — l'art de lire les signes."
          loading="lazy"
        />
      </div>

      <div className="container-narrow">
      <div style={{ marginBottom: 30 }}>
        <Link href="/app" style={{ fontSize: '0.82rem', color: 'var(--ombre)', textDecoration: 'none' }}>
          {th('backToSpace')}
        </Link>
        <h1 style={{ fontSize: '1.6rem', marginTop: 10 }}>{th('title')}</h1>
        <p style={{ color: 'var(--ombre)', fontSize: '0.9rem' }}>{th('subtitle')}</p>
      </div>

      {error && (
        <div className="card" style={{ padding: '14px 18px', marginBottom: 20, borderColor: 'var(--lever)', color: 'var(--lever-profond)', fontSize: '0.86rem' }}>
          {error}
        </div>
      )}

      {!error && entries.length === 0 && (
        <div className="card" style={{ padding: '36px 24px', textAlign: 'center', color: 'var(--sourdine)' }}>
          <EmptyStateIllustration size={72} />
          <p style={{ margin: '14px 0 0' }}>{th('empty')}</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {entries.map((entry) => {
          const sign = entry.sign ? findSign(entry.sign) : null;
          const featureKey = FEATURE_LABELS[entry.feature as FeatureKey] ? (entry.feature as FeatureKey) : undefined;
          const featureNom = featureKey ? tp(`features.${featureKey}.nom`) : undefined;

          // Tolère les lignes enregistrées avant la correction de l'encodage
          // (stockées comme une chaîne JSON au lieu d'un objet JSONB).
          let rawReading: unknown = entry.reading;
          if (typeof rawReading === 'string') {
            try {
              rawReading = JSON.parse(rawReading);
            } catch {
              rawReading = null;
            }
          }
          const date = new Date(entry.created_at).toLocaleDateString(dateLocaleTag(locale), {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });
          const dateLabel = `${date}${featureNom ? ` · ${featureNom}` : ''}`;
          const signInfo = sign ? localizedSign({ nom: sign.nom, symbole: sign.symbole, dates: sign.dates, element: sign.element, planete: sign.planete, key: sign.key }, locale) : null;

          let cardNode: React.ReactNode = null;

          if (entry.feature === 'theme_astral_complet') {
            const chart = rawReading as AstralChart | null;
            if (chart?.portrait) {
              cardNode = <AstralChartCard chart={chart} signInfo={signInfo} dateLabel={dateLabel} creditsSpent={entry.credits_spent} />;
            }
          } else if (entry.feature === 'analyse_sentimentale') {
            const sentiment = rawReading as SentimentReading | null;
            if (sentiment?.titre) {
              cardNode = <SentimentCard reading={sentiment} signInfo={signInfo} dateLabel={dateLabel} creditsSpent={entry.credits_spent} />;
            }
          } else if (entry.feature === 'compatibilite_amoureuse') {
            const compat = rawReading as (CompatibilityReading & { autreSigne?: { key: string; nom: string; symbole: string; prenom?: string }; moiPrenom?: string }) | null;
            if (compat?.resume) {
              cardNode = (
                <CompatibilityCard
                  reading={compat}
                  signInfo={signInfo}
                  autreSigne={compat.autreSigne ?? null}
                  moiPrenom={compat.moiPrenom}
                  dateLabel={dateLabel}
                  creditsSpent={entry.credits_spent}
                />
              );
            }
          } else if (entry.feature === 'grande_analyse') {
            const grande = rawReading as GrandeAnalyse | null;
            if (grande?.synthese) {
              cardNode = <GrandeAnalyseCard reading={grande} signInfo={signInfo} dateLabel={dateLabel} creditsSpent={entry.credits_spent} />;
            }
          } else if (entry.feature === 'cycle_lunaire') {
            const lunar = rawReading as LunarCycleReading | null;
            if (lunar?.interpretation) {
              cardNode = <LunarCycleCard reading={lunar} signInfo={signInfo} dateLabel={dateLabel} creditsSpent={entry.credits_spent} />;
            }
          } else if (entry.feature === 'transits_planetaires') {
            const transits = rawReading as TransitsReading | null;
            if (transits?.interpretation) {
              cardNode = <TransitsCard reading={transits} signInfo={signInfo} dateLabel={dateLabel} creditsSpent={entry.credits_spent} />;
            }
          } else if (THEME_KEYS.has(entry.feature)) {
            const thematic = rawReading as ThematicReading | null;
            if (thematic?.texte) {
              cardNode = (
                <ThematicCard
                  reading={thematic}
                  signInfo={signInfo}
                  featureNom={featureNom ?? th('readingFallback')}
                  dateLabel={dateLabel}
                  creditsSpent={entry.credits_spent}
                />
              );
            }
          } else {
            const reading = rawReading as Reading | null;
            if (reading?.headline) {
              cardNode = <ReadingCard reading={reading} signInfo={signInfo} dateLabel={dateLabel} creditsSpent={entry.credits_spent} />;
            }
          }

          if (cardNode) {
            const extrait = featureKey ? extraitAPartager(featureKey, rawReading as Record<string, unknown>) : null;
            const texteAPartager = extrait
              ? td('shareTextWithHighlight', { highlight: extrait.length > 140 ? `${extrait.slice(0, 140)}…` : extrait })
              : td('shareTextFallback');
            return (
              <div key={entry.id}>
                {cardNode}
                <ShareButton
                  shareText={texteAPartager}
                  shareUrl={shareLink}
                  title={td('shareTitle')}
                  subtitle={td('shareSubtitle')}
                  label={td('shareButton')}
                  copiedLabel={td('shareCopied')}
                />
              </div>
            );
          }

          // Lecture faite avant l'activation de l'historique : le contenu
          // n'a jamais été enregistré, impossible de le retrouver.
          return (
            <div key={entry.id} className="card" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--sourdine)' }}>{dateLabel}</span>
                <span className="mono" style={{ fontSize: '0.76rem', color: 'var(--lever-profond)' }}>-{entry.credits_spent} cr.</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--sourdine)' }}>
                {th('contentUnavailable')}
              </p>
            </div>
          );
        })}
      </div>
      </div>
    </main>
  );
}
