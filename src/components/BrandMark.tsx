// Petit filigrane de marque — le « O » d'Horosphère (anneau + étincelle),
// dans le même langage graphique que DegreeArc/AstrolabeIllustration
// (aucune image bitmap, uniquement des variables CSS pour les couleurs).
// Remplace le petit arc de degré dans le coin des cartes : un rappel du
// logo, en transparence, plutôt qu'une graduation.

export default function BrandMark({
  size = 56,
  opacity = 0.35,
}: {
  size?: number;
  opacity?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;
  const spike = size * 0.22;
  const spikeDiag = spike * 0.58;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ opacity }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--lever-profond)" strokeWidth={size * 0.05} />
      <g stroke="var(--ambre)" strokeWidth={size * 0.028} strokeLinecap="round">
        <line x1={cx} y1={cy - spike} x2={cx} y2={cy + spike} />
        <line x1={cx - spike} y1={cy} x2={cx + spike} y2={cy} />
        <line x1={cx - spikeDiag} y1={cy - spikeDiag} x2={cx + spikeDiag} y2={cy + spikeDiag} />
        <line x1={cx - spikeDiag} y1={cy + spikeDiag} x2={cx + spikeDiag} y2={cy - spikeDiag} />
      </g>
    </svg>
  );
}
