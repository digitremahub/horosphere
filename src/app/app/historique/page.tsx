import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getHistory } from '@/lib/credits';
import { getProfile } from '@/lib/profile';
import { dbConfigured } from '@/lib/db';
import { FEATURE_LABELS, FeatureKey } from '@/lib/pricing';
import { THEMES } from '@/lib/themes';
import { findSign } from '@/lib/zodiac';
import ReadingCard, { type Reading } from '@/components/ReadingCard';
import AstralChartCard, { type AstralChart } from '@/components/AstralChartCard';
import SentimentCard from '@/components/SentimentCard';
import CompatibilityCard from '@/components/CompatibilityCard';
import GrandeAnalyseCard from '@/components/GrandeAnalyseCard';
import ThematicCard from '@/components/ThematicCard';
import LunarCycleCard from '@/components/LunarCycleCard';
import TransitsCard from '@/components/TransitsCard';
import EmptyStateIllustration from '@/components/EmptyStateIllustration';
import type { SentimentReading, CompatibilityReading, GrandeAnalyse, ThematicReading, LunarCycleReading, TransitsReading } from '@/lib/anthropic';

const THEME_KEYS = new Set(Object.keys(THEMES));

export default async function HistoriquePage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/connexion');
  }

  const userId = Number((session!.user as { id?: string }).id);

  // Profil de naissance obligatoire avant tout usage — voir /app/profil.
  if (dbConfigured) {
    let hasProfile = true;
    try {
      hasProfile = Boolean(await getProfile(userId));
    } catch {
      hasProfile = true; // erreur de lecture transitoire : ne pas bloquer l'accès
    }
    if (!hasProfile) {
      redirect('/app/profil');
    }
  }

  let entries: Awaited<ReturnType<typeof getHistory>> = [];
  let error: string | null = null;

  if (dbConfigured) {
    try {
      entries = await getHistory(userId, 30);
    } catch {
      error = "Impossible de charger l'historique pour le moment.";
    }
  } else {
    error = "La base de données n'est pas encore connectée — l'historique ne peut pas être affiché.";
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
        <a href="/app" style={{ fontSize: '0.82rem', color: 'var(--ombre)', textDecoration: 'none' }}>
          ← Mon espace
        </a>
        <h1 style={{ fontSize: '1.6rem', marginTop: 10 }}>Historique</h1>
        <p style={{ color: 'var(--ombre)', fontSize: '0.9rem' }}>Vos lectures passées, les plus récentes en premier — exactement comme le jour où vous les avez générées.</p>
      </div>

      {error && (
        <div className="card" style={{ padding: '14px 18px', marginBottom: 20, borderColor: 'var(--lever)', color: 'var(--lever-profond)', fontSize: '0.86rem' }}>
          {error}
        </div>
      )}

      {!error && entries.length === 0 && (
        <div className="card" style={{ padding: '36px 24px', textAlign: 'center', color: 'var(--sourdine)' }}>
          <EmptyStateIllustration size={72} />
          <p style={{ margin: '14px 0 0' }}>Aucune lecture pour l'instant. Vos horoscopes générés apparaîtront ici.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {entries.map((entry) => {
          const sign = entry.sign ? findSign(entry.sign) : null;
          const meta = FEATURE_LABELS[entry.feature as FeatureKey] as { nom: string } | undefined;

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
          const date = new Date(entry.created_at).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });
          const dateLabel = `${date}${meta ? ` · ${meta.nom}` : ''}`;
          const signInfo = sign ? { nom: sign.nom, symbole: sign.symbole, dates: sign.dates, element: sign.element, planete: sign.planete } : null;

          if (entry.feature === 'theme_astral_complet') {
            const chart = rawReading as AstralChart | null;
            if (chart?.portrait) {
              return (
                <AstralChartCard
                  key={entry.id}
                  chart={chart}
                  signInfo={signInfo}
                  dateLabel={dateLabel}
                  creditsSpent={entry.credits_spent}
                />
              );
            }
          } else if (entry.feature === 'analyse_sentimentale') {
            const sentiment = rawReading as SentimentReading | null;
            if (sentiment?.titre) {
              return (
                <SentimentCard
                  key={entry.id}
                  reading={sentiment}
                  signInfo={signInfo}
                  dateLabel={dateLabel}
                  creditsSpent={entry.credits_spent}
                />
              );
            }
          } else if (entry.feature === 'compatibilite_amoureuse') {
            const compat = rawReading as (CompatibilityReading & { autreSigne?: { key: string; nom: string; symbole: string; prenom?: string }; moiPrenom?: string }) | null;
            if (compat?.resume) {
              return (
                <CompatibilityCard
                  key={entry.id}
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
              return (
                <GrandeAnalyseCard
                  key={entry.id}
                  reading={grande}
                  signInfo={signInfo}
                  dateLabel={dateLabel}
                  creditsSpent={entry.credits_spent}
                />
              );
            }
          } else if (entry.feature === 'cycle_lunaire') {
            const lunar = rawReading as LunarCycleReading | null;
            if (lunar?.interpretation) {
              return (
                <LunarCycleCard
                  key={entry.id}
                  reading={lunar}
                  signInfo={signInfo}
                  dateLabel={dateLabel}
                  creditsSpent={entry.credits_spent}
                />
              );
            }
          } else if (entry.feature === 'transits_planetaires') {
            const transits = rawReading as TransitsReading | null;
            if (transits?.interpretation) {
              return (
                <TransitsCard
                  key={entry.id}
                  reading={transits}
                  signInfo={signInfo}
                  dateLabel={dateLabel}
                  creditsSpent={entry.credits_spent}
                />
              );
            }
          } else if (THEME_KEYS.has(entry.feature)) {
            const thematic = rawReading as ThematicReading | null;
            if (thematic?.texte) {
              return (
                <ThematicCard
                  key={entry.id}
                  reading={thematic}
                  signInfo={signInfo}
                  featureNom={meta?.nom ?? 'Lecture'}
                  dateLabel={dateLabel}
                  creditsSpent={entry.credits_spent}
                />
              );
            }
          } else {
            const reading = rawReading as Reading | null;
            if (reading?.headline) {
              return (
                <ReadingCard
                  key={entry.id}
                  reading={reading}
                  signInfo={signInfo}
                  dateLabel={dateLabel}
                  creditsSpent={entry.credits_spent}
                />
              );
            }
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
                Contenu non disponible — cette lecture a été générée avant l'activation de l'historique.
              </p>
            </div>
          );
        })}
      </div>
      </div>
    </main>
  );
}
