// Illustration "instrument" — un astrolabe stylisé en ligne fine, dans le
// même langage graphique que DegreeArc/MoonPhase (aucune image bitmap).
// Les points sur l'anneau intérieur sont les 7 planètes traditionnelles,
// placées à leur véritable longitude écliptique géocentrique du moment
// (voir lib/planets.ts, calculée via astronomy-engine — aucun appel
// réseau), chacune identifiée par son glyphe (nom complet + signe + degré
// au survol, voir <title>). Contrairement aux planètes, l'anneau extérieur
// (graduations + arceau + aiguille) est purement décoratif : il tourne très
// lentement pour suggérer un instrument vivant, sans jamais représenter de
// donnée réelle — c'est pourquoi les planètes et leurs glyphes sont rendus
// dans un groupe SÉPARÉ, non affecté par la rotation (un glyphe qui
// tournerait avec l'anneau deviendrait illisible la moitié du temps).
// Le décalage d'animation ci-dessous est calé sur l'horloge système plutôt
// que sur 0 : sans ça, l'anneau repartait du même point de départ à chaque
// chargement de page, ce qui donnait l'impression que l'instrument
// "revenait en arrière" au lieu de sembler tourner en continu. Rotation
// désactivée par prefers-reduced-motion via la règle globale de globals.css.

import { currentPlanetPositions, zodiacSignAt } from '@/lib/planets';

const TICKS = Array.from({ length: 12 }, (_, i) => i * 30);
const SPIN_DURATION_S = 90;

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

  // Négatif : l'animation est "déjà en cours" de ce nombre de secondes au
  // moment du rendu, plutôt que de toujours repartir de 0.
  const spinDelay = -((Date.now() / 1000) % SPIN_DURATION_S);

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label={ariaLabel}>
      <g
        className="astrolabe-spin"
        style={{ transformOrigin: '100px 100px', animationDelay: `${spinDelay}s` }}
      >
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

      {/* Planètes et glyphes : position réelle, jamais affectée par la
          rotation décorative ci-dessus — sinon un glyphe à l'envers la
          moitié du temps serait illisible plutôt qu'informatif. */}
      {planets.map((p) => {
        const { x, y } = toXY(p.longitude, 72);
        const label = toXY(p.longitude, 82);
        const sign = zodiacSignAt(p.longitude);
        const degInSign = Math.floor(p.longitude % 30);
        return (
          <g key={p.key}>
            <circle cx={x} cy={y} r={2.8} fill={p.couleur} />
            <text
              x={label.x}
              y={label.y}
              fill={p.couleur}
              fontSize="9"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {p.glyphe}
            </text>
            <title>{`${p.nom} — ${degInSign}° ${sign.nom}`}</title>
          </g>
        );
      })}

      <circle cx="100" cy="100" r="30" fill="none" stroke="var(--trait)" strokeWidth="1" />
      <path d="M 100 76 A 24 24 0 0 0 100 124 A 18 24 0 0 1 100 76 Z" fill="var(--ambre)" opacity="0.85" />
    </svg>
  );
}
