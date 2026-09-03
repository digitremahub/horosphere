import DegreeArc from '@/components/DegreeArc';
import { Field, Meter, Lucky, SignCircle } from '@/components/CardParts';

export type AstralChart = {
  portrait: string;
  forces: string;
  defis: string;
  amour: string;
  carriere: string;
  spiritualite: string;
  scoreAmour: number;
  scoreCarriere: number;
  scoreSpiritualite: number;
  conseilDeVie: string;
  pierrePorteBonheur: string;
  symboleCle: string;
  mode: 'ia' | 'demo';
};

type SignInfo = { nom: string; symbole: string; dates: string; element?: string; planete?: string };

// Carte du thème astral complet — un portrait de fond (pas une lecture du
// jour), utilisée à la fois pour le résultat fraîchement généré (Dashboard)
// et pour chaque entrée de l'historique (/app/historique).
export default function AstralChartCard({
  chart,
  signInfo,
  dateLabel,
  creditsSpent,
  cornerArc = true,
}: {
  chart: AstralChart;
  signInfo: SignInfo | null;
  dateLabel?: string;
  creditsSpent?: number;
  cornerArc?: boolean;
}) {
  return (
    <div className="card card-enter" style={{ padding: '26px 24px', overflow: 'visible' }}>
      <div className="photo-frame" style={{ height: 120, marginBottom: 18 }}>
        <img
          src="/images/bg-theme-astral.png"
          alt="Un astrolabe doré, mécanisme du thème astral."
          loading="lazy"
        />
      </div>

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

      {chart.mode === 'demo' && (
        <div className="pill" style={{ marginBottom: 14, borderColor: 'var(--ambre)', color: 'var(--ambre)' }}>
          Mode démo{dateLabel ? '' : ' — clé IA non configurée'}
        </div>
      )}

      {signInfo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--trait)' }}>
          <SignCircle symbole={signInfo.symbole} />
          <div>
            <div style={{ fontWeight: 700 }}>{signInfo.nom} — thème astral</div>
            <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--sourdine)' }}>
              {[signInfo.element, signInfo.planete].filter(Boolean).join(' · ') || signInfo.dates}
            </div>
          </div>
        </div>
      )}

      <p style={{ margin: '0 0 18px', fontSize: '0.94rem', lineHeight: 1.6, color: 'var(--encre)' }}>{chart.portrait}</p>

      <Field label="Forces" color="var(--lever)" text={chart.forces} />
      <Field label="Axe de progression" color="var(--prune)" text={chart.defis} />

      <div style={{ height: 1, background: 'var(--trait)', margin: '18px 0' }} />

      <Field label="Amour" color="var(--prune)" text={chart.amour} />
      <Field label="Carrière" color="var(--lever)" text={chart.carriere} />
      <Field label="Équilibre intérieur" color="var(--sauge)" text={chart.spiritualite} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '18px 0' }}>
        <Meter label="Amour" value={chart.scoreAmour} color="var(--prune)" />
        <Meter label="Carrière" value={chart.scoreCarriere} color="var(--lever)" />
        <Meter label="Équilibre intérieur" value={chart.scoreSpiritualite} color="var(--sauge)" />
      </div>

      <div style={{ background: 'var(--brume)', border: '1px dashed var(--trait)', borderRadius: 14, padding: '13px 16px', marginBottom: 18 }}>
        <div style={{ fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--lever-profond)', marginBottom: 4 }}>Conseil de fond</div>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>{chart.conseilDeVie}</p>
      </div>

      <div className="lucky-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', borderTop: '1px solid var(--trait)', paddingTop: 14 }}>
        <Lucky label="Pierre" value={chart.pierrePorteBonheur} />
        <Lucky label="Symbole clé" value={chart.symboleCle} divider />
      </div>
    </div>
  );
}
