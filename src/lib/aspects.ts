// Signes "les plus concernés" par un événement situé dans un signe donné —
// technique traditionnelle des aspects durs (conjonction, opposition,
// carré), les plus dynamiques/ressentis en astrologie, par opposition aux
// aspects doux (trigone, sextile). Relation géométrique fixe sur le
// zodiaque (0°, 90°, 180°) : toujours les 3 mêmes signes pour un signe
// donné, jamais choisis au hasard ou inventés.

import { Body, Ecliptic, GeoVector } from 'astronomy-engine';
import { SIGNS, type Sign } from './zodiac';

export type Aspect = 'conjonction' | 'opposition' | 'carre';
export type ImpactedSign = { signe: Sign; aspect: Aspect };

export function signesLesPlusImpactes(signeKey: string): ImpactedSign[] {
  const idx = SIGNS.findIndex((s) => s.key === signeKey);
  if (idx === -1) return [];
  return [
    { signe: SIGNS[idx], aspect: 'conjonction' },
    { signe: SIGNS[(idx + 6) % 12], aspect: 'opposition' },
    { signe: SIGNS[(idx + 3) % 12], aspect: 'carre' },
  ];
}

export const ASPECT_LABEL: Record<Aspect, string> = {
  conjonction: 'en prise directe',
  opposition: 'en opposition',
  carre: 'en carré',
};

// ===== Cycle du Soleil dans son signe actuel =====
// signesLesPlusImpactes() est ancré sur le signe du Soleil, qui ne change
// qu'une douzaine de fois par an (~30 jours par signe) — contrairement à la
// lune ou aux positions planétaires du jour, cette liste de signes reste
// donc identique pendant toute la durée d'un cycle solaire. soleilCycleActuel
// calcule les dates exactes d'entrée/sortie de ce cycle (pas les dates
// calendaires habituelles, qui varient légèrement d'une année à l'autre),
// pour pouvoir l'indiquer explicitement plutôt que de laisser croire à une
// actualité qui changerait chaque semaine (voir lib/skyNews.ts).

const UN_JOUR_MS = 86400000;
function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}
function sunLongitude(date: Date): number {
  return normalizeDeg(Ecliptic(GeoVector(Body.Sun, date, true)).elon);
}
function sunSignIndex(date: Date): number {
  return Math.floor(sunLongitude(date) / 30);
}

/** Bissection générique : `same` est un instant du signe `signeIndex`,
 * `other` un instant d'un signe différent — converge vers l'instant exact
 * de la frontière entre les deux, du côté de `same` (utilisable aussi bien
 * pour trouver une entrée qu'une sortie de signe). */
function frontiereDuSigne(same: Date, other: Date, signeIndex: number): Date {
  let a = same;
  let b = other;
  for (let i = 0; i < 30; i++) {
    const mid = new Date((a.getTime() + b.getTime()) / 2);
    if (sunSignIndex(mid) === signeIndex) a = mid;
    else b = mid;
  }
  return a;
}

/** Balayage grossier (jour par jour, jusqu'à 40 jours — un signe dure
 * toujours moins longtemps que ça) pour trouver un premier instant hors du
 * signe `signeIndex`, avant la bissection précise. */
function premierJourAutreSigne(from: Date, signeIndex: number, pasJours: 1 | -1): Date {
  for (let i = 1; i <= 40; i++) {
    const jour = new Date(from.getTime() + pasJours * i * UN_JOUR_MS);
    if (sunSignIndex(jour) !== signeIndex) return jour;
  }
  return new Date(from.getTime() + pasJours * 40 * UN_JOUR_MS);
}

export type CycleSolaire = { signe: Sign; debut: Date; fin: Date };

/** Fenêtre exacte du transit solaire en cours (le "cycle" qui détermine les
 * signes les plus concernés) — début et fin calculés, jamais approximés. */
export function soleilCycleActuel(date: Date = new Date()): CycleSolaire {
  const signeIndex = sunSignIndex(date);
  const finAutre = premierJourAutreSigne(date, signeIndex, 1);
  const debutAutre = premierJourAutreSigne(date, signeIndex, -1);
  return {
    signe: SIGNS[signeIndex],
    debut: frontiereDuSigne(date, debutAutre, signeIndex),
    fin: frontiereDuSigne(date, finAutre, signeIndex),
  };
}
