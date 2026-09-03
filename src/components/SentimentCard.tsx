import BrandMark from '@/components/BrandMark';
import { Field, Meter, Lucky, SignCircle } from '@/components/CardParts';
import type { SentimentReading } from '@/lib/anthropic';

type SignInfo = { nom: string; symbole: string; dates: string };

// Carte de l'analyse sentimentale — portée hebdomadaire (weekKey), pas
// journalière. Réutilisée à la fois pour le résultat fraîchement généré
// (Dashboard) et pour chaque entrée de l'historique (/app/historique).
export default function SentimentCard({
  reading,
  signInfo,
  dateLabel,
  creditsSpent,
  cornerArc = true,
}: {
  reading: SentimentReading;
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
            <div style={{ fontWeight: 700 }}>{signInfo.nom} — analyse sentimentale</div>
            <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--sourdine)' }}>Cette semaine</div>
          </div>
        </div>
      )}

      <p className="display" style={{ fontStyle: 'italic', fontSize: '1.2rem', marginBottom: 16 }}>{reading.titre}</p>

      <Field label="Émotion dominante" color="var(--prune)" text={reading.dominante} />
      <Field label="Ce qui se joue" color="var(--lever)" text={reading.enJeu} />
      <Field label="Relations" color="var(--sauge)" text={reading.relations} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '18px 0' }}>
        <Meter label="Clarté" value={reading.scoreClarte} color="var(--lever)" />
        <Meter label="Intensité" value={reading.scoreIntensite} color="var(--prune)" />
      </div>

      <div style={{ background: 'var(--brume)', border: '1px dashed var(--trait)', borderRadius: 14, padding: '13px 16px', marginBottom: 18 }}>
        <div style={{ fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--lever-profond)', marginBottom: 4 }}>Conseil de la semaine</div>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>{reading.conseil}</p>
      </div>

      <div className="lucky-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', borderTop: '1px solid var(--trait)', paddingTop: 14 }}>
        <Lucky label="Mot clé de la semaine" value={reading.motCle} />
      </div>
    </div>
  );
}
