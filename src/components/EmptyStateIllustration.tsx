// Illustration pour les états vides — lune et étoiles en ligne fine, dans
// le même langage graphique qu'AstrolabeIllustration (aucune image bitmap,
// donc aucun risque de corruption au déploiement). Flotte doucement
// (float-gentle), désactivée par prefers-reduced-motion via la règle
// globale de globals.css.

const STARS = [
  { x: 150, y: 46, r: 2.4 },
  { x: 168, y: 74, r: 1.6 },
  { x: 158, y: 108, r: 1.9 },
  { x: 44, y: 132, r: 1.5 },
  { x: 62, y: 158, r: 2 },
  { x: 34, y: 96, r: 1.4 },
];

export default function EmptyStateIllustration({ size = 96 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      aria-hidden="true"
      style={{ display: 'inline-block' }}
    >
      <circle cx="100" cy="100" r="88" fill="none" stroke="var(--ambre)" strokeWidth="1" opacity="0.28" />

      {/* Croissant, tracé comme dans AstrolabeIllustration */}
      <path
        d="M 100 58 A 42 42 0 0 0 100 142 A 30 42 0 0 1 100 58 Z"
        fill="var(--ambre)"
        opacity="0.85"
      />
      <path
        d="M 100 58 A 42 42 0 0 0 100 142"
        fill="none"
        stroke="var(--lever-profond)"
        strokeWidth="1"
        opacity="0.4"
      />

      {/* Étoiles éparses, comme celles de l'astrolabe */}
      {STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="var(--lever)" opacity="0.55" />
      ))}

      {/* Petite croix scintillante pour l'étoile la plus proche du croissant */}
      <g opacity="0.5" stroke="var(--lever)" strokeWidth="1" strokeLinecap="round">
        <line x1="150" y1="40" x2="150" y2="52" />
        <line x1="144" y1="46" x2="156" y2="46" />
      </g>
    </svg>
  );
}
