import BrandMark from '@/components/BrandMark';
import { Field, Meter, SignCircle } from '@/components/CardParts';
import type { GrandeAnalyse } from '@/lib/anthropic';

type SignInfo = { nom: string; symbole: string; dates: string; element?: string; planete?: string };

// Carte de la grande analyse personnalisée — le bilan le plus complet
// (tous les axes de vie), contrairement au thème astral (portrait de fond)
// ou à l'horoscope (limité au jour). Réutilisée pour le résultat frais
// (Dashboard) et l'historique.
export default function GrandeAnalyseCard({
  reading,
  signInfo,
  dateLabel,
  creditsSpent,
  cornerArc = true,
}: {
  reading: GrandeAnalyse;
  signInfo: SignInfo | null;
  dateLabel?: string;
  creditsSpent?: number;
  cornerArc?: boolean;
}) {
  return (
    <div className="card card-enter" style={{ padding: '26px 24px', overflow: 'visible' }}>
      {cornerArc && (
        <div style={{ position: 'absolute', top: -13, right: -13, pointerEvents: 'none' }} aria-hidden="true">
          <BrandMark size={60} />
        </div>
      )}

      {(dateLabel || creditsSpent !== undefined) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          {dateLabel && (
            <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--sourdine)' }}>
              {dateLabel}
            </span>
          )}
          {creditsSpent !== undefined && (
            <span className="mono" style={{ fontSize: '0.76rem', color: 'var(--lever-profond)', whiteSpace: 'nowrap' }}>
              -{creditsSpent} cr.
            </span>
          )}
        </div>
      )}

      {reading.mode === 'demo' && (
        <div className="pill" style={{ marginBottom: 14, borderColor: 'var(--ambre)', color: 'var(--ambre)' }}>
          Mode démo{dateLabel ? '' : ' — clé IA non configurée'}
        </div>
      )}

      {signInfo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--trait)' }}>
          <SignCircle symbole={signInfo.symbole} />
          <div>
            <div style={{ fontWeight: 700 }}>{signInfo.nom} — grande analyse</div>
            <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--sourdine)' }}>
              Portée : {reading.periodeCle}
            </div>
          </div>
        </div>
      )}

      {(reading.ascendantSigne || reading.luneSigne) && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          {reading.ascendantSigne && (
            <div className="pill" style={{ borderColor: 'var(--lever)', color: 'var(--lever-profond)' }}>
              {reading.ascendantSigne.symbole} Ascendant {reading.ascendantSigne.nom}
            </div>
          )}
          {reading.luneSigne && (
            <div className="pill" style={{ borderColor: 'var(--sauge)', color: 'var(--sauge)' }}>
              {reading.luneSigne.symbole} Lune natale en {reading.luneSigne.nom}
            </div>
          )}
        </div>
      )}

      <p style={{ margin: '0 0 18px', fontSize: '0.94rem', lineHeight: 1.6, color: 'var(--encre)' }}>{reading.synthese}</p>

      <Field label="Amour" color="var(--prune)" text={reading.amour} />
      <Field label="Carrière" color="var(--lever)" text={reading.carriere} />
      <Field label="Finances" color="var(--ambre)" text={reading.finances} />
      <Field label="Santé" color="var(--sauge)" text={reading.sante} />
      <Field label="Famille" color="var(--lever-profond)" text={reading.famille} />
      <Field label="Évolution personnelle" color="var(--ombre)" text={reading.evolutionPersonnelle} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '18px 0' }}>
        <Meter label="Amour" value={reading.scoreAmour} color="var(--prune)" />
        <Meter label="Carrière" value={reading.scoreCarriere} color="var(--lever)" />
        <Meter label="Santé" value={reading.scoreSante} color="var(--sauge)" />
        <Meter label="Finances" value={reading.scoreFinances} color="var(--ambre)" />
      </div>

      <div style={{ background: 'var(--brume)', border: '1px dashed var(--trait)', borderRadius: 14, padding: '13px 16px' }}>
        <div style={{ fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--lever-profond)', marginBottom: 4 }}>Conseil principal</div>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>{reading.conseilPrincipal}</p>
      </div>
    </div>
  );
}
