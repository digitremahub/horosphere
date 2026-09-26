// Désactivation des comptes inactifs, depuis le backoffice — demande
// explicite de l'utilisateur (26/09). Choix assumés (voir échange avant
// implémentation) :
// - "Inactif" = profil complété il y a plus de `joursSeuil` jours, jamais
//   d'abonnement, jamais de crédit consommé. Un compte sans profil (inscription
//   jamais terminée) n'a pas de date fiable côté `users` (pas de created_at
//   sur cette table, schéma standard @auth/pg-adapter) : on ne le propose
//   donc pas ici plutôt que de risquer de viser une inscription de la veille.
// - Désactivation réversible, pas de suppression : on bloque juste la
//   connexion (mot de passe, lien magique, et sessions JWT déjà émises —
//   voir lib/auth.ts) sans toucher aux données. Aucune anonymisation :
//   une vraie anonymisation ne serait plus restaurable, ce qui contredirait
//   la réversibilité demandée.

import { requireDb } from './db';
import { isAdminEmail, getAdminEmails } from './adminAuth';

let colonneAssuree = false;

/** `users.desactive_le` (NULL = compte actif) — auto-créée au premier appel,
 * même logique que `categorie` dans lib/admin.ts : CREATE TABLE IF NOT
 * EXISTS ne rajoute pas une colonne sur une table déjà existante en
 * production. */
async function ensureDesactiveColumn(sql: ReturnType<typeof requireDb>) {
  if (colonneAssuree) return;
  await sql.unsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS desactive_le TIMESTAMPTZ`);
  colonneAssuree = true;
}

export type CompteInactifRow = {
  user_id: number;
  email: string;
  prenom: string | null;
  nom: string | null;
  inscrit_le: string;
  jours_inscrit: number;
};

/** Comptes candidats à la désactivation : profil complété il y a plus de
 * `joursSeuil` jours, jamais d'abonnement ni de crédit consommé, pas déjà
 * désactivé, ni admin, ni catégorie spéciale (influenceur/bêta testeur). */
export async function listInactiveUsersAdmin(joursSeuil = 90): Promise<CompteInactifRow[]> {
  const sql = requireDb();
  await ensureDesactiveColumn(sql);
  const adminEmails = getAdminEmails();
  return sql<CompteInactifRow[]>`
    SELECT
      u.id AS user_id,
      u.email,
      p.prenom,
      p.nom,
      p.created_at::text AS inscrit_le,
      EXTRACT(DAY FROM now() - p.created_at)::int AS jours_inscrit
    FROM users u
    JOIN profiles p ON p.user_id = u.id
    WHERE u.desactive_le IS NULL
      AND u.categorie IS NULL
      AND u.email != ALL(${adminEmails})
      AND p.created_at < now() - (${joursSeuil} || ' days')::interval
      AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM credit_usage cu WHERE cu.user_id = u.id)
    ORDER BY p.created_at ASC
    LIMIT 200
  `;
}

export type CompteDesactiveRow = {
  user_id: number;
  email: string;
  prenom: string | null;
  nom: string | null;
  desactive_le: string;
};

export async function listDeactivatedUsersAdmin(): Promise<CompteDesactiveRow[]> {
  const sql = requireDb();
  await ensureDesactiveColumn(sql);
  return sql<CompteDesactiveRow[]>`
    SELECT u.id AS user_id, u.email, p.prenom, p.nom, u.desactive_le::text AS desactive_le
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE u.desactive_le IS NOT NULL
    ORDER BY u.desactive_le DESC
    LIMIT 200
  `;
}

export type ActionCompteResult = { ok: boolean; message: string };

export async function desactiverCompte(userId: number): Promise<ActionCompteResult> {
  const sql = requireDb();
  await ensureDesactiveColumn(sql);
  const [row] = await sql<{ email: string }[]>`SELECT email FROM users WHERE id = ${userId}`;
  if (!row) return { ok: false, message: 'Utilisateur introuvable.' };
  if (isAdminEmail(row.email)) return { ok: false, message: 'Impossible de désactiver un compte admin.' };
  await sql`UPDATE users SET desactive_le = now() WHERE id = ${userId}`;
  return { ok: true, message: `Compte ${row.email} désactivé (connexion bloquée, données conservées).` };
}

export async function reactiverCompte(userId: number): Promise<ActionCompteResult> {
  const sql = requireDb();
  await ensureDesactiveColumn(sql);
  const [row] = await sql<{ email: string }[]>`SELECT email FROM users WHERE id = ${userId}`;
  if (!row) return { ok: false, message: 'Utilisateur introuvable.' };
  await sql`UPDATE users SET desactive_le = NULL WHERE id = ${userId}`;
  return { ok: true, message: `Compte ${row.email} réactivé.` };
}

/** Utilisé par lib/auth.ts à chaque tentative de connexion et à chaque
 * lecture de session (stratégie JWT : un jeton déjà émis avant la
 * désactivation reste valide côté client tant qu'on ne revérifie pas en
 * base à chaque appel — voir le callback `session`). */
export async function estCompteDesactive(userId: number): Promise<boolean> {
  const sql = requireDb();
  await ensureDesactiveColumn(sql);
  const [row] = await sql<{ desactive_le: string | null }[]>`SELECT desactive_le FROM users WHERE id = ${userId}`;
  return Boolean(row?.desactive_le);
}
