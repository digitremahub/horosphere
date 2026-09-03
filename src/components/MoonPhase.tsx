// Composant serveur — calcule la phase lunaire réelle du jour et dessine
// une silhouette plate à deux tons (aucune dépendance externe, aucune animation).

const SYNODIC_MONTH_DAYS = 29.53058867;
// Nouvelle lune de référence connue : 6 janvier 2000, 18:14 UTC.
const REFERENCE_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0);

export function currentMoonPhase(date: Date = new Date()): number {
  const diffDays = (date.getTime() - REFERENCE_NEW_MOON) / 86400000;
  let phase = (diffDays % SYNODIC_MONTH_DAYS) / SYNODIC_MONTH_DAYS;
  if (phase < 0) phase += 1;
  return phase; // 0 = nouvelle lune, 0.5 = pleine lune
}

export function phaseLabel(phase: number): string {
  if (phase < 0.03 || phase > 0.97) return 'Nouvelle lune';
  if (phase < 0.22) return 'Premier croissant';
  if (phase < 0.28) return 'Premier quartier';
  if (phase < 0.47) return 'Lune gibbeuse croissante';
  if (phase < 0.53) return 'Pleine lune';
  if (phase < 0.72) return 'Lune gibbeuse décroissante';
  if (phase < 0.78) return 'Dernier quartier';
  return 'Dernier croissant';
}

/** Textes d'influence associés à chaque phase — un ton d'observation, jamais
 * fataliste, cohérent avec la voix éditoriale d'Horosphère. Utilisé par la
 * section "Lune du jour" de la page d'accueil. */
export const MOON_INFLUENCES: Record<string, string> = {
  'Nouvelle lune': "Un ciel vierge, propice aux intentions neuves. C'est le bon moment pour poser une idée sur le papier plutôt que pour l'exécuter.",
  'Premier croissant': "L'élan démarre. Les premiers pas d'un projet demandent moins de certitude que de régularité — avancez sans attendre d'y voir clair.",
  'Premier quartier': "Une tension utile s'installe : c'est le moment de trancher une décision que vous repoussez depuis plusieurs jours.",
  'Lune gibbeuse croissante': "L'énergie s'accumule. Affinez les détails de ce que vous avez lancé plutôt que d'ouvrir un nouveau chantier.",
  'Pleine lune': "Ce qui était en germe se révèle pleinement. Les émotions sont plus vives — observez-les avant d'agir sous leur coup.",
  'Lune gibbeuse décroissante': "Le moment du bilan. Gardez ce qui a fonctionné, laissez partir le reste sans vous y attarder.",
  'Dernier quartier': "Une phase de tri. Ce qui doit se clore se clôt plus facilement aujourd'hui — ne forcez pas ce qui résiste.",
  'Dernier croissant': "Le ciel se repose avant le renouveau. Ralentissez si vous le pouvez : la prochaine nouvelle lune n'attend pas d'être méritée.",
};

export type MoonInfo = {
  phase: number;
  label: string;
  influence: string;
  illumination: number;
  dateLabel: string;
};

/** Point d'entrée unique pour la section "Lune du jour" : phase réelle du
 * jour, libellé, texte d'influence et pourcentage d'illumination. */
export function moonPhaseInfo(date: Date = new Date()): MoonInfo {
  const phase = currentMoonPhase(date);
  const label = phaseLabel(phase);
  const illumination = Math.round((1 - Math.cos(phase * 2 * Math.PI)) * 50);
  const dateLabel = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return { phase, label, influence: MOON_INFLUENCES[label] ?? '', illumination, dateLabel };
}

/**
 * Chemin SVG de la partie illuminée, centré sur (0,0), pour un rayon r et
 * une phase 0..1 (0 = nouvelle lune, 0.5 = pleine lune).
 */
function illuminatedPath(phase: number, r: number): string {
  const theta = phase * 2 * Math.PI;
  const rx = Math.abs(r * Math.cos(theta));
  const sweep1 = phase < 0.5 ? 1 : 0;
  const sweep2 = phase < 0.5 ? 0 : 1;
  return `M 0 ${-r} A ${r} ${r} 0 0 ${sweep1} 0 ${r} A ${rx} ${r} 0 0 ${sweep2} 0 ${-r} Z`;
}

export default function MoonPhase({ size = 20 }: { size?: number }) {
  const phase = currentMoonPhase();
  const r = size / 2 - 1;
  const label = phaseLabel(phase);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Phase lunaire actuelle : ${label}`}
    >
      <title>{label}</title>
      <g transform={`translate(${size / 2}, ${size / 2})`}>
        <circle cx={0} cy={0} r={r} fill="var(--brume)" stroke="var(--encre)" strokeOpacity={0.18} strokeWidth={1} />
        <path d={illuminatedPath(phase, r)} fill="var(--ambre)" />
      </g>
    </svg>
  );
}
