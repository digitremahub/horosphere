// Signes "les plus concernés" par un événement situé dans un signe donné —
// technique traditionnelle des aspects durs (conjonction, opposition,
// carré), les plus dynamiques/ressentis en astrologie, par opposition aux
// aspects doux (trigone, sextile). Relation géométrique fixe sur le
// zodiaque (0°, 90°, 180°) : toujours les 3 mêmes signes pour un signe
// donné, jamais choisis au hasard ou inventés.

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
