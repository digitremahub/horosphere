// Grande illustration décorative — une roue du zodiaque en ligne fine,
// dans le même langage graphique qu'AstrolabeIllustration/EmptyStateIllustration
// (aucune image bitmap). Pensée pour habiller les pages plus nues
// (connexion, profil, accueil) avec une pièce plus dense et évocatrice,
// à la façon des "cartes du ciel" qu'on trouve chez d'autres sites
// d'astrologie — mais toujours dans notre trait fin ambre/terracotta.
// `spin` active une rotation très lente (comme l'astrolabe) ; sinon
// l'illustration reste fixe, pour ne pas surcharger une page déjà animée.

const SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

const STARS = [
  { angle: 8, r: 132, size: 2 },
  { angle: 52, r: 140, size: 1.4 },
  { angle: 100, r: 128, size: 1.8 },
  { angle: 148, r: 138, size: 1.4 },
  { angle: 200, r: 130, size: 2 },
  { angle: 250, r: 142, size: 1.5 },
  { angle: 300, r: 134, size: 1.7 },
  { angle: 340, r: 140, size: 1.4 },
];

function toXY(angle: number, r: number, cx = 120, cy = 120) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export default function ZodiacWheelIllustration({
  size = 420,
  spin = false,
  opacity = 1,
}: {
  size?: number;
  spin?: boolean;
  opacity?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 240 240" aria-hidden="true" style={{ opacity }}>
      <g className={spin ? 'astrolabe-spin' : undefined} style={{ transformOrigin: '120px 120px' }}>
        <circle cx="120" cy="120" r="112" fill="none" stroke="var(--ambre)" strokeWidth="1" opacity="0.45" />
        <circle cx="120" cy="120" r="86" fill="none" stroke="var(--ambre)" strokeWidth="1" opacity="0.3" />
        <circle cx="120" cy="120" r="52" fill="none" stroke="var(--lever)" strokeWidth="1" opacity="0.28" />

        {SYMBOLS.map((sym, i) => {
          const angle = i * 30;
          const pos = toXY(angle, 99);
          const inner = toXY(angle, 86);
          const outer = toXY(angle, 112);
          return (
            <g key={sym}>
              <line
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="var(--ambre)"
                strokeWidth="1"
                opacity="0.35"
              />
              <circle cx={pos.x} cy={pos.y} r="11" fill="var(--nacre)" stroke="var(--ambre)" strokeWidth="1" opacity="0.9" />
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="11"
                fill="var(--lever-profond)"
              >
                {sym}
              </text>
            </g>
          );
        })}

        {STARS.map((s, i) => {
          const { x, y } = toXY(s.angle, s.r);
          return <circle key={i} cx={x} cy={y} r={s.size} fill="var(--lever)" opacity="0.45" />;
        })}
      </g>

      {/* Centre fixe, ancrage visuel — ne tourne jamais, même si spin est actif */}
      <circle cx="120" cy="120" r="30" fill="none" stroke="var(--trait)" strokeWidth="1" />
      <path d="M 120 96 A 24 24 0 0 0 120 144 A 18 24 0 0 1 120 96 Z" fill="var(--ambre)" opacity="0.8" />
    </svg>
  );
}
