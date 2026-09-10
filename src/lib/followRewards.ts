// Crédits offerts pour le suivi des comptes réseaux sociaux d'Horosphère —
// décision explicite de l'utilisateur : "un système de gain de crédit si
// les gens nous suivent sur les réseaux", avec preuve par capture d'écran
// plutôt qu'une vérification technique (aucune API Instagram/Facebook/
// TikTok ne permet de vérifier le suivi d'un compte personnel sans une
// procédure OAuth lourde côté Meta, inexistante pour TikTok). La capture
// est donc relue manuellement dans le backoffice avant crédit — voir
// traiterPreuveSuivi.

import { requireDb } from './db';
import { grantCredits } from './credits';
import { CREDIT_EXPIRY_DAYS } from './pricing';

export type PlateformeSuivi = 'instagram' | 'facebook' | 'tiktok';
export const PLATEFORMES_SUIVI: PlateformeSuivi[] = ['instagram', 'facebook', 'tiktok'];

// Même montant sur les trois réseaux (décision explicite) — un utilisateur
// qui suit les trois comptes peut donc gagner jusqu'à 9 crédits au total.
export const CREDITS_SUIVI = 3;

export type StatutPreuveSuivi = 'en_attente' | 'approuve' | 'rejete';

export type PreuveSuivi = {
  id: number;
  user_id: number;
  plateforme: PlateformeSuivi;
  image_url: string;
  statut: StatutPreuveSuivi;
  credits: number;
  created_at: string;
  traite_le: string | null;
  traite_par: string | null;
};

let schemaEnsured = false;

async function ensureSchema(sql: ReturnType<typeof requireDb>) {
  if (schemaEnsured) return;
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS preuves_suivi_social (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plateforme TEXT NOT NULL,
      image_url TEXT NOT NULL,
      statut TEXT NOT NULL DEFAULT 'en_attente',
      credits INTEGER NOT NULL DEFAULT ${CREDITS_SUIVI},
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      traite_le TIMESTAMPTZ,
      traite_par TEXT
    );
    CREATE INDEX IF NOT EXISTS preuves_suivi_social_user_idx ON preuves_suivi_social(user_id);
    CREATE INDEX IF NOT EXISTS preuves_suivi_social_statut_idx ON preuves_suivi_social(statut);
  `);
  schemaEnsured = true;
}

/** État courant, par plateforme, des demandes de l'utilisateur — la plus
 * récente fait foi (permet de resoumettre après un refus). `null` = jamais
 * réclamé. Alimente l'affichage de la carte "Suivez-nous" du profil. */
export async function statutSuiviUtilisateur(userId: number): Promise<Partial<Record<PlateformeSuivi, PreuveSuivi>>> {
  const sql = requireDb();
  await ensureSchema(sql);
  const rows = await sql<PreuveSuivi[]>`
    SELECT DISTINCT ON (plateforme) *
    FROM preuves_suivi_social
    WHERE user_id = ${userId}
    ORDER BY plateforme, created_at DESC
  `;
  const parPlateforme: Partial<Record<PlateformeSuivi, PreuveSuivi>> = {};
  for (const row of rows) parPlateforme[row.plateforme] = row;
  return parPlateforme;
}

export class DemandeDejaEnCoursError extends Error {
  constructor() {
    super('Une demande est déjà en attente ou déjà validée pour ce réseau.');
  }
}

/** Stocke la capture d'écran sur Vercel Blob et enregistre la demande en
 * attente de relecture. Refuse une nouvelle soumission tant qu'une demande
 * précédente pour la même plateforme est en attente ou déjà approuvée
 * (une demande refusée, elle, peut être resoumise). */
export async function soumettrePreuveSuivi(
  userId: number,
  plateforme: PlateformeSuivi,
  fichier: { buffer: Buffer; contentType: string }
): Promise<void> {
  const sql = requireDb();
  await ensureSchema(sql);

  const existantes = await statutSuiviUtilisateur(userId);
  const derniere = existantes[plateforme];
  if (derniere && derniere.statut !== 'rejete') {
    throw new DemandeDejaEnCoursError();
  }

  const { put } = await import('@vercel/blob');
  const storeId = process.env.BLOB_HOROSPHERE_STORE_ID;
  const extension = fichier.contentType === 'image/png' ? 'png' : 'jpg';
  const blob = await put(`suivi-social/${userId}-${plateforme}-${Date.now()}.${extension}`, fichier.buffer, {
    access: 'public',
    contentType: fichier.contentType,
    ...(storeId ? { storeId } : {}),
  });

  await sql`
    INSERT INTO preuves_suivi_social (user_id, plateforme, image_url, statut, credits)
    VALUES (${userId}, ${plateforme}, ${blob.url}, 'en_attente', ${CREDITS_SUIVI})
  `;
}

export type PreuveSuiviAvecUtilisateur = PreuveSuivi & { email: string };

/** Demandes en attente de relecture, les plus anciennes en premier — pour
 * le backoffice (page /app/admin). */
export async function listPreuvesEnAttente(): Promise<PreuveSuiviAvecUtilisateur[]> {
  const sql = requireDb();
  await ensureSchema(sql);
  return sql<PreuveSuiviAvecUtilisateur[]>`
    SELECT p.*, u.email
    FROM preuves_suivi_social p
    JOIN users u ON u.id = p.user_id
    WHERE p.statut = 'en_attente'
    ORDER BY p.created_at ASC
  `;
}

/** Valide ou refuse une demande — le crédit n'est accordé qu'à
 * l'approbation, jamais à la soumission. `adminEmail` trace qui a tranché. */
export async function traiterPreuveSuivi(id: number, decision: 'approuve' | 'rejete', adminEmail: string): Promise<void> {
  const sql = requireDb();
  await ensureSchema(sql);

  const rows = await sql<PreuveSuivi[]>`
    SELECT * FROM preuves_suivi_social WHERE id = ${id} AND statut = 'en_attente'
  `;
  const preuve = rows[0];
  if (!preuve) return; // déjà traitée (double clic) — pas d'erreur, rien à refaire

  await sql`
    UPDATE preuves_suivi_social
    SET statut = ${decision}, traite_le = now(), traite_par = ${adminEmail}
    WHERE id = ${id}
  `;

  if (decision === 'approuve') {
    await grantCredits(preuve.user_id, preuve.credits, `follow:${preuve.plateforme}`, CREDIT_EXPIRY_DAYS);
  }
}
