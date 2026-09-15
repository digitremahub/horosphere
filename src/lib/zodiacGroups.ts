// Regroupement des 12 signes par qualité astrologique (cardinaux / fixes /
// mutables) — partagé par les formats "tous les signes en un post" (voir
// lib/careerPost.ts et lib/dailyAllSignsPost.ts) : un seul post couvre les
// 12 signes à la fois, regroupés par 4 sur 3 pages, plutôt qu'un post par
// signe. SIGNS est déjà dans l'ordre du calendrier (Bélier → Poissons), donc
// la qualité se déduit directement de la position (index % 3) sans avoir
// besoin d'un champ dédié sur Sign — 0 = cardinaux (Bélier, Cancer, Balance,
// Capricorne), 1 = fixes (Taureau, Lion, Scorpion, Verseau), 2 = mutables
// (Gémeaux, Vierge, Sagittaire, Poissons).

import { SIGNS, type Sign } from './zodiac';

export const NOMS_QUALITE = ['Signes cardinaux', 'Signes fixes', 'Signes mutables'] as const;

export function signesParQualite(qualite: 0 | 1 | 2): Sign[] {
  return SIGNS.filter((_, i) => i % 3 === qualite);
}

export type SignePhrase = { sign: Sign; phrase: string };
export type PageGroupe = { titre: string; signes: SignePhrase[] };

/** Les 3 pages de groupe (cardinaux/fixes/mutables), une phrase par signe,
 * à partir d'une table complète {signKey: phrase}. Partagé par tous les
 * formats "tous les signes en un post". */
export function pagesParQualite(phrases: Record<Sign['key'], string>): [PageGroupe, PageGroupe, PageGroupe] {
  return ([0, 1, 2] as const).map((qualite) => ({
    titre: NOMS_QUALITE[qualite],
    signes: signesParQualite(qualite).map((sign) => ({ sign, phrase: phrases[sign.key] })),
  })) as [PageGroupe, PageGroupe, PageGroupe];
}
