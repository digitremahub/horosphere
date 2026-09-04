import BrandMark from '@/components/BrandMark';
import { Field, Meter, SignCircle } from '@/components/CardParts';
import type { ThematicReading } from '@/lib/anthropic';

type SignInfo = { nom: string; symbole: string; dates: string };

// Carte partagée par les 6 lectures thématiques "simples" (vision
// hebdomadaire, snapshot natal, horoscope carrière/amoureux, aide à la
// décision, guidance spirituelle) — voir lib/themes.ts. Un seul composant,
// paramétré par le libellé de la fonctionnalité plutôt que 6 cartes
// quasi identiques.
export default function ThematicCard({
  reading,
  signInfo,
  featureNom,
  dateLabel,
  creditsSpent,
  cornerArc = true,
}: {
  reading: ThematicReading;
  signInfo: SignInfo | null;
  featureNom: string;
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
            <div style={{ fontWeight: 700 }}>{featureNom}</div>
            <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--sourdine)' }}>{signInfo.nom}</div>
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

      <p className="display" style={{ fontStyle: 'italic', fontSize: '1.2rem', marginBottom: 16 }}>{reading.titre}</p>

      <Field label={featureNom} color="var(--lever)" text={reading.texte} />
      <Field label="À surveiller" color="var(--prune)" text={reading.pointAttention} />

      <div style={{ margin: '18px 0' }}>
        <Meter label="Énergie du moment" value={reading.score} color="var(--lever)" />
      </div>

      <div style={{ background: 'var(--brume)', border: '1px dashed var(--trait)', borderRadius: 14, padding: '13px 16px' }}>
        <div style={{ fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--lever-profond)', marginBottom: 4 }}>Conseil</div>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>{reading.conseil}</p>
      </div>
    </div>
  );
}
