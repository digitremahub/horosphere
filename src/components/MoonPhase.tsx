// Composant serveur — calcule la phase lunaire réelle du jour et dessine
// une silhouette plate à deux tons (aucune dépendance externe, aucune animation).

import { dateLocaleTag } from '@/i18n/dateLocale';
import { localizedPhaseLabel, localizedPhaseInfluence, type MoonLocale } from '@/lib/moon-i18n';

const SYNODIC_MONTH_DAYS = 29.53058867;
// Nouvelle lune de référence connue : 6 janvier 2000, 18:14 UTC.
const REFERENCE_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0);

export function currentMoonPhase(date: Date = new Date()): number {
  const diffDays = (date.getTime() - REFERENCE_NEW_MOON) / 86400000;
  let phase = (diffDays % SYNODIC_MONTH_DAYS) / SYNODIC_MONTH_DAYS;
  if (phase < 0) phase += 1;
  return phase; // 0 = nouvelle lune, 0.5 = pleine lune
}

/** Libellé français de la phase — conservé pour les usages qui ont
 * spécifiquement besoin du français (contenu généré en français par
 * défaut : lib/social.ts, lib/skyNews.ts). Pour un affichage localisé, voir
 * lib/moon-i18n.ts (localizedPhaseLabel). */
export function phaseLabel(phase: number): string {
  return localizedPhaseLabel(phase, 'fr');
}

export type MoonInfo = {
  phase: number;
  label: string;
  influence: string;
  illumination: number;
  dateLabel: string;
};

/** Point d'entrée unique pour la section "Lune du jour" : phase réelle du
 * jour, libellé, texte d'influence et pourcentage d'illumination — dans la
 * langue demandée (par défaut le français, pour les usages de génération de
 * contenu qui ne suivent pas la locale du site, ex. lib/social.ts). */
export function moonPhaseInfo(date: Date = new Date(), locale: MoonLocale = 'fr'): MoonInfo {
  const phase = currentMoonPhase(date);
  const label = localizedPhaseLabel(phase, locale);
  const influence = localizedPhaseInfluence(phase, locale);
  const illumination = Math.round((1 - Math.cos(phase * 2 * Math.PI)) * 50);
  const dateLabel = date.toLocaleDateString(dateLocaleTag(locale), { weekday: 'long', day: 'numeric', month: 'long' });
  return { phase, label, influence, illumination, dateLabel };
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

export default function MoonPhase({
  size = 20,
  phase: phaseOverride,
  locale = 'fr',
}: {
  size?: number;
  phase?: number;
  locale?: MoonLocale;
}) {
  // `phase` permet de rejouer une phase passée (historique d'une lecture
  // "cycle lunaire") plutôt que de toujours afficher la phase du jour.
  const phase = phaseOverride ?? currentMoonPhase();
  const r = size / 2 - 1;
  const label = localizedPhaseLabel(phase, locale);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      <g transform={`translate(${size / 2}, ${size / 2})`}>
        <circle cx={0} cy={0} r={r} fill="var(--brume)" stroke="var(--encre)" strokeOpacity={0.18} strokeWidth={1} />
        <path d={illuminatedPath(phase, r)} fill="var(--ambre)" />
      </g>
    </svg>
  );
}
