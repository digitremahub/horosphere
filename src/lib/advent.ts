// Calendrier de l'avent — stratégie d'acquisition : une case par jour du 1er
// au 24 décembre, réclamable une seule fois par utilisateur CONNECTÉ (pas de
// vérification des réseaux sociaux — Meta ne permet pas de vérifier
// automatiquement qu'un utilisateur suit un compte ou a commenté, voir la
// discussion produit). Le vrai levier d'acquisition est là : il faut un
// compte Horosphère pour réclamer, chaque jour ramène donc du trafic ET de
// l'inscription. Pas de rattrapage — une case non réclamée le jour même est
// perdue, comme un vrai calendrier de l'avent.

import { requireDb } from './db';
import { grantCredits } from './credits';
import { CREDIT_EXPIRY_DAYS } from './pricing';

// Crédits offerts par jour (index 0 = 1er décembre, ... index 23 = 24
// décembre) — valeurs volontairement simples à ajuster ici, sans toucher au
// reste de la logique. Quelques jours un peu plus généreux (dimanches
// symboliques du calendrier) et un dernier jour (24) marquant.
export const RECOMPENSES_AVENT: number[] = [
  1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 3, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 5,
];

export type StatutAvent = {
  actif: boolean; // true seulement en décembre, du 1er au 24
  jourDuJour: number; // 0 si `actif` est faux
  joursReclames: number[]; // jours (1-24) déjà réclamés cette année
};

function jourEtAnneeCourants(): { mois: number; jour: number; annee: number } {
  const now = new Date();
  return { mois: now.getUTCMonth() + 1, jour: now.getUTCDate(), annee: now.getUTCFullYear() };
}

export async function statutAvent(userId: number): Promise<StatutAvent> {
  const { mois, jour, annee } = jourEtAnneeCourants();
  const actif = mois === 12 && jour <= 24;

  const sql = requireDb();
  const rows = await sql<{ day: number }[]>`
    SELECT day FROM advent_claims WHERE user_id = ${userId} AND year = ${annee}
  `;

  return { actif, jourDuJour: actif ? jour : 0, joursReclames: rows.map((r) => r.day) };
}

export type ReclamationAvent =
  | { ok: true; jour: number; credits: number }
  | { ok: false; raison: 'hors-periode' | 'deja-reclame' };

export async function reclamerCadeauAvent(userId: number): Promise<ReclamationAvent> {
  const { mois, jour, annee } = jourEtAnneeCourants();
  if (mois !== 12 || jour > 24) {
    return { ok: false, raison: 'hors-periode' };
  }

  const credits = RECOMPENSES_AVENT[jour - 1] ?? 1;
  const sql = requireDb();
  const inserted = await sql`
    INSERT INTO advent_claims (user_id, year, day, credits)
    VALUES (${userId}, ${annee}, ${jour}, ${credits})
    ON CONFLICT (user_id, year, day) DO NOTHING
    RETURNING user_id
  `;
  if (inserted.length === 0) {
    return { ok: false, raison: 'deja-reclame' };
  }

  await grantCredits(userId, credits, `avent:${annee}:${jour}`, CREDIT_EXPIRY_DAYS);
  return { ok: true, jour, credits };
}
