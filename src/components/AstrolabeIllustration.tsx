// Illustration "instrument" — un astrolabe stylisé en ligne fine, dans le
// même langage graphique que DegreeArc/MoonPhase (aucune image bitmap).
// Les points sur l'anneau intérieur sont les 7 planètes traditionnelles,
// placées à leur véritable longitude écliptique géocentrique du moment
// (voir lib/planets.ts, calculée via astronomy-engine — aucun appel
// réseau). L'anneau extérieur tourne très lentement pour suggérer un
// instrument vivant sans jamais distraire ; le croissant central reste fixe
// (le point d'ancrage, "aujourd'hui"). La rotation, purement décorative, ne
// change pas la position relative des planètes entre elles ni par rapport
// aux graduations du zodiaque. Désactivée par prefers-reduced-motion via la
// règle globale de globals.css.

import { currentPlanetPositions, zodiacSignAt } from '@/lib/planets';

const TICKS = Array.from({ length: 12 }, (_, i) => i * 30);

function toXY(angle: number, r: number, cx = 100, cy = 100) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export default function AstrolabeIllustration({ size = 320 }: { size?: number }) {
  const armTip = toXY(38, 88);
  const planets = currentPlanetPositions();
  const ariaLabel = `Position actuelle des planètes sur le zodiaque : ${planets
    .map((p) => {
      const sign = zodiacSignAt(p.longitude);
      return `${p.nom} en ${sign.nom}`;
    })
    .join(', ')}.`;

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label={ariaLabel}>
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
        {planets.map((p) => {
          const { x, y } = toXY(p.longitude, 72);
          const sign = zodiacSignAt(p.longitude);
          const degInSign = Math.floor(p.longitude % 30);
          return (
            <g key={p.key}>
              <circle cx={x} cy={y} r={2.8} fill={p.couleur} />
              <title>{`${p.nom} — ${degInSign}° ${sign.nom}`}</title>
            </g>
          );
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
