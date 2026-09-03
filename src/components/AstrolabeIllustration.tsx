// Illustration décorative "instrument" — un astrolabe stylisé en ligne fine,
// dans le même langage graphique que DegreeArc/MoonPhase (aucune image
// bitmap). L'anneau extérieur tourne très lentement pour suggérer un
// instrument vivant sans jamais distraire ; le croissant central reste fixe
// (le point d'ancrage, "aujourd'hui"). Désactivée par
// prefers-reduced-motion via la règle globale de globals.css.

const TICKS = Array.from({ length: 12 }, (_, i) => i * 30);
const STARS = [
  { angle: 15, r: 78, size: 2.2 },
  { angle: 95, r: 84, size: 1.6 },
  { angle: 160, r: 76, size: 1.8 },
  { angle: 230, r: 86, size: 1.4 },
  { angle: 290, r: 80, size: 2 },
  { angle: 340, r: 74, size: 1.6 },
];

function toXY(angle: number, r: number, cx = 100, cy = 100) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export default function AstrolabeIllustration({ size = 320 }: { size?: number }) {
  const armTip = toXY(38, 88);

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden="true">
      <g className="astrolabe-spin" style={{ transformOrigin: '100px 100px' }}>
        <circle cx="100" cy="100" r="90" fill="none" stroke="var(--ambre)" strokeWidth="1" opacity="0.55" />
        {TICKS.map((angle) => {
          const inner = toXY(angle, 84);
          const outer = toXY(angle, 90);
          return (
            <line
              key={angle}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="var(--ambre)"
              strokeWidth="1"
              opacity="0.55"
            />
          );
        })}
        {STARS.map((s, i) => {
          const { x, y } = toXY(s.angle, s.r);
          return <circle key={i} cx={x} cy={y} r={s.size} fill="var(--lever)" opacity="0.6" />;
        })}
        <circle cx="100" cy="100" r="60" fill="none" stroke="var(--lever)" strokeWidth="1" opacity="0.35" />
        <line
          x1="100"
          y1="100"
          x2={armTip.x}
          y2={armTip.y}
          stroke="var(--lever-profond)"
          strokeWidth="1.4"
          opacity="0.5"
          strokeLinecap="round"
        />
      </g>

      <circle cx="100" cy="100" r="30" fill="none" stroke="var(--trait)" strokeWidth="1" />
      <path d="M 100 76 A 24 24 0 0 0 100 124 A 18 24 0 0 1 100 76 Z" fill="var(--ambre)" opacity="0.85" />
    </svg>
  );
}
