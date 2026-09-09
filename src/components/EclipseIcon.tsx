// Icône plate à deux tons, même langage graphique que MoonPhase — pas
// d'image bitmap. "Solaire" : disque du Soleil (ambre) + couronne de rayons,
// en grande partie recouvert par le disque sombre de la Lune. "Lunaire" : la
// Lune recouverte par l'ombre rougeâtre de la Terre — le "blood moon" typique
// d'une éclipse lunaire totale/partielle.
export default function EclipseIcon({ kind, size = 48 }: { kind: 'lunar' | 'solar'; size?: number }) {
  const r = size / 2 - 3;
  const label = kind === 'solar' ? 'Éclipse solaire' : 'Éclipse lunaire';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
      <title>{label}</title>
      <g transform={`translate(${size / 2}, ${size / 2})`}>
        {kind === 'solar' ? (
          <>
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const x1 = Math.cos(angle) * (r + 2);
              const y1 = Math.sin(angle) * (r + 2);
              const x2 = Math.cos(angle) * (r + 7);
              const y2 = Math.sin(angle) * (r + 7);
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ambre)" strokeWidth={1.4} opacity={0.6} />;
            })}
            <circle cx={0} cy={0} r={r} fill="var(--ambre)" />
            <circle cx={r * 0.4} cy={0} r={r} fill="var(--encre)" />
          </>
        ) : (
          <>
            <circle cx={0} cy={0} r={r} fill="var(--brume)" stroke="var(--encre)" strokeOpacity={0.18} strokeWidth={1} />
            <circle cx={r * 0.35} cy={0} r={r} fill="var(--lever-profond)" opacity={0.78} />
          </>
        )}
      </g>
    </svg>
  );
}
