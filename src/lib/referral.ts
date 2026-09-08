// Parrainage — mis en avant un jour du calendrier de l'avent ("invite un
// ami"), mais valable toute l'année via le même lien personnel. Le code de
// parrainage est directement dérivé de l'id utilisateur (base36) : pas de
// colonne dédiée à générer ni à maintenir, juste à décoder. Le crédit du
// parrain n'est accordé qu'à la CRÉATION RÉELLE d'un nouveau compte
// (événement createUser de NextAuth, voir lib/auth.ts) — jamais au simple
// clic sur le lien, pour limiter les abus (comptes jetables sans usage
// réel).

import { requireDb } from './db';
import { grantCredits } from './credits';

export const CREDITS_PARRAIN = 3;
export const CREDITS_FILLEUL = 2;

export function codeParrainage(userId: number): string {
  return userId.toString(36);
}

function userIdDepuisCode(code: string): number | null {
  const id = parseInt(code, 36);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function lienParrainage(userId: number): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://horosphere.fr').replace(/\/$/, '');
  return `${base}/connexion?parrain=${codeParrainage(userId)}`;
}

/** Enregistre une intention de parrainage juste avant l'envoi du lien
 * magique — on ne sait pas encore si cet e-mail correspond à un nouveau
 * compte ou à quelqu'un déjà inscrit (voir finaliserParrainageSiPresent,
 * qui tranche). Le dernier lien de parrainage utilisé gagne si l'e-mail
 * redemande un lien plusieurs fois avant de finaliser son inscription. */
export async function enregistrerIntentionParrainage(email: string, codeParrain: string): Promise<void> {
  const parrainUserId = userIdDepuisCode(codeParrain);
  if (!parrainUserId) return;
  const sql = requireDb();
  await sql`
    INSERT INTO parrainages_attente (email, parrain_user_id)
    VALUES (${email.toLowerCase().trim()}, ${parrainUserId})
    ON CONFLICT (email) DO UPDATE SET parrain_user_id = EXCLUDED.parrain_user_id, created_at = now()
  `;
}

/** Appelée depuis l'événement createUser (voir lib/auth.ts) : si ce nouvel
 * utilisateur avait une intention de parrainage en attente, crédite les
 * deux comptes et enregistre le parrainage. filleul_user_id en clé
 * primaire de `parrainages` : personne ne peut être parrainé deux fois. */
export async function finaliserParrainageSiPresent(nouvelUtilisateurId: number, email: string): Promise<void> {
  const sql = requireDb();
  const rows = await sql<{ parrain_user_id: number }[]>`
    DELETE FROM parrainages_attente WHERE email = ${email.toLowerCase().trim()} RETURNING parrain_user_id
  `;
  const parrainUserId = rows[0]?.parrain_user_id;
  if (!parrainUserId || parrainUserId === nouvelUtilisateurId) return; // pas d'auto-parrainage

  try {
    await sql`INSERT INTO parrainages (parrain_user_id, filleul_user_id) VALUES (${parrainUserId}, ${nouvelUtilisateurId})`;
  } catch {
    return; // déjà parrainé par ailleurs (contrainte unique) — rien de plus à faire
  }

  await grantCredits(parrainUserId, CREDITS_PARRAIN, 'parrainage:parrain', null);
  await grantCredits(nouvelUtilisateurId, CREDITS_FILLEUL, 'parrainage:filleul', null);
}
