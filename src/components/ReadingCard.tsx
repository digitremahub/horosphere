import DegreeArc from '@/components/DegreeArc';
import { Field, Meter, Lucky, SignCircle } from '@/components/CardParts';

export type Reading = {
  headline: string;
  amour: string;
  travail: string;
  energie: string;
  conseil: string;
  scoreAmour: number;
  scoreTravail: number;
  scoreEnergie: number;
  couleur: string;
  chiffre: number;
  talisman: string;
  mode: 'ia' | 'demo';
};

type SignInfo = { nom: string; symbole: string; dates: string };

// Carte de lecture complète — utilisée à la fois pour le résultat fraîchement
// généré (Dashboard) et pour chaque entrée de l'historique (/app/historique),
// afin que l'utilisateur retrouve exactement la même chose que le jour où il
// a payé : titre, amour/travail/énergie, jauges, conseil, et objets porte-bonheur.
export default function ReadingCard({
  reading,
  signInfo,
  dateLabel,
  creditsSpent,
  cornerArc = true,
}: {
  reading: Reading;
  signInfo: SignInfo | null;
  dateLabel?: string;
  creditsSpent?: number;
  cornerArc?: boolean;
}) {
  return (
    <div className="card card-enter" style={{ padding: '26px 24px', overflow: 'visible' }}>
      {cornerArc && (
        <div style={{ position: 'absolute', top: -13, right: -13, pointerEvents: 'none' }} aria-hidden="true">
          <DegreeArc startAngle={-80} endAngle={0} size={60} ticks={3} strokeWidth={1.4} showTick />
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
            <div style={{ fontWeight: 700 }}>{signInfo.nom}</div>
            <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--sourdine)' }}>{signInfo.dates}</div>
          </div>
        </div>
      )}

      <p className="display" style={{ fontStyle: 'italic', fontSize: '1.2rem', marginBottom: 16 }}>{reading.headline}</p>

      <Field label="Amour" color="var(--prune)" text={reading.amour} />
      <Field label="Travail" color="var(--lever)" text={reading.travail} />
      <Field label="Énergie" color="var(--sauge)" text={reading.energie} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '18px 0' }}>
        <Meter label="Amour" value={reading.scoreAmour} color="var(--prune)" />
        <Meter label="Travail" value={reading.scoreTravail} color="var(--lever)" />
        <Meter label="Énergie" value={reading.scoreEnergie} color="var(--sauge)" />
      </div>

      <div style={{ background: 'var(--brume)', border: '1px dashed var(--trait)', borderRadius: 14, padding: '13px 16px', marginBottom: 18 }}>
        <div style={{ fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--lever-profond)', marginBottom: 4 }}>Conseil du jour</div>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>{reading.conseil}</p>
      </div>

      <div className="lucky-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '1px solid var(--trait)', paddingTop: 14 }}>
        <Lucky label="Couleur" value={reading.couleur} />
        <Lucky label="Chiffre" value={String(reading.chiffre)} mono divider />
        <Lucky label="Talisman" value={reading.talisman} divider />
      </div>
    </div>
  );
}
