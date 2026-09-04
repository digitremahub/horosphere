// Positions réelles des planètes sur le zodiaque — calculées à la demande
// (pas de dépendance réseau, la librairie astronomy-engine embarque son
// propre modèle orbital). Longitude écliptique géocentrique = la valeur que
// l'astrologie utilise pour placer une planète dans le zodiaque tropical.

import { Body, Ecliptic, GeoVector } from 'astronomy-engine';
import { SIGNS } from './zodiac';

export type PlanetPosition = {
  key: string;
  nom: string;
  glyphe: string;
  couleur: string;
  longitude: number; // degrés, 0-360, 0 = début du Bélier
  retrograde: boolean;
};

// Le Soleil et la Lune n'ont jamais de rétrogradation apparente réelle —
// seules les 5 planètes "errantes" classiques peuvent sembler reculer sur
// le zodiaque, vues depuis la Terre.
const PEUT_RETROGRADER = new Set(['mercure', 'venus', 'mars', 'jupiter', 'saturne']);

const PLANETES: { body: Body; key: string; nom: string; glyphe: string; couleur: string }[] = [
  { body: Body.Sun, key: 'soleil', nom: 'Soleil', glyphe: '☉', couleur: 'var(--ambre)' },
  { body: Body.Moon, key: 'lune', nom: 'Lune', glyphe: '☽', couleur: 'var(--sourdine)' },
  { body: Body.Mercury, key: 'mercure', nom: 'Mercure', glyphe: '☿', couleur: 'var(--lever)' },
  { body: Body.Venus, key: 'venus', nom: 'Vénus', glyphe: '♀', couleur: 'var(--prune)' },
  { body: Body.Mars, key: 'mars', nom: 'Mars', glyphe: '♂', couleur: 'var(--lever-profond)' },
  { body: Body.Jupiter, key: 'jupiter', nom: 'Jupiter', glyphe: '♃', couleur: 'var(--sauge)' },
  { body: Body.Saturn, key: 'saturne', nom: 'Saturne', glyphe: '♄', couleur: 'var(--ombre)' },
];

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

const UN_JOUR_MS = 86400000;

/** Rétrograde = la longitude écliptique diminue d'un jour à l'autre, vue
 * depuis la Terre — un effet de perspective réel (pas un présage), calculé
 * en comparant deux positions réelles, jamais affirmé sans ce calcul. */
function estRetrograde(body: Body, date: Date): boolean {
  const lon0 = normalizeDeg(Ecliptic(GeoVector(body, date, true)).elon);
  const lon1 = normalizeDeg(Ecliptic(GeoVector(body, new Date(date.getTime() + UN_JOUR_MS), true)).elon);
  let diff = lon1 - lon0;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff < 0;
}

/** Position actuelle (ou à une date donnée) des 7 planètes traditionnelles,
 * telles que vues depuis la Terre — utilisée pour placer chaque planète sur
 * l'anneau de AstrolabeIllustration, et pour signaler une rétrogradation en
 * cours (voir lib/skyNews.ts). */
export function currentPlanetPositions(date: Date = new Date()): PlanetPosition[] {
  return PLANETES.map((p) => {
    const geo = GeoVector(p.body, date, true);
    const ecl = Ecliptic(geo);
    return {
      key: p.key,
      nom: p.nom,
      glyphe: p.glyphe,
      couleur: p.couleur,
      longitude: normalizeDeg(ecl.elon),
      retrograde: PEUT_RETROGRADER.has(p.key) && estRetrograde(p.body, date),
    };
  });
}

export function zodiacSignAt(longitude: number) {
  return SIGNS[Math.floor(normalizeDeg(longitude) / 30)];
}
