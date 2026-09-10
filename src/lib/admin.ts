// Requêtes pour le backoffice (/app/admin) — accès restreint, voir
// lib/adminAuth.ts. Volontairement en lecture (liste + stats) : les
// actions de gestion d'abonnement (annulation, remboursement ponctuel...)
// restent faites depuis le Dashboard Stripe lui-même — reconstruire ça ici
// dupliquerait un outil déjà fiable, avec le risque en plus. La page se
// contente de retrouver rapidement le bon client Stripe.

import { requireDb } from './db';

export type AdminUserRow = {
  user_id: number;
  email: string;
  prenom: string | null;
  nom: string | null;
  inscrit_le: string | null;
  abonnement_plan: string | null;
  abonnement_statut: string | null;
  abonnement_debut: string | null;
  abonnement_fin: string | null;
  categorie: string | null;
  solde_credits: number;
  stripe_customer_id: string | null;
};

let categorieColumnEnsured = false;

/** `users.categorie` (influenceur / bêta testeur / aucune) — voir
 * lib/adminCategories.ts. Auto-créée au premier appel (CREATE TABLE IF NOT
 * EXISTS ne s'applique pas à une colonne : ALTER ... ADD COLUMN IF NOT
 * EXISTS, même idée), pas besoin de rejouer db/schema.sql à la main. */
async function ensureCategorieColumn(sql: ReturnType<typeof requireDb>) {
  if (categorieColumnEnsured) return;
  await sql.unsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS categorie TEXT`);
  categorieColumnEnsured = true;
}

/** Les utilisateurs les plus récents (inscription = date de création du
 * profil, `users` n'a pas de colonne created_at — schéma standard
 * @auth/pg-adapter). `limit` reste modeste : cette page est un tableau de
 * bord rapide, pas un export complet. */
export async function listUsersAdmin(limit = 200): Promise<AdminUserRow[]> {
  const sql = requireDb();
  await ensureCategorieColumn(sql);
  return sql<AdminUserRow[]>`
    SELECT
      u.id AS user_id,
      u.email,
      u.categorie,
      p.prenom,
      p.nom,
      p.created_at::text AS inscrit_le,
      s.plan_slug AS abonnement_plan,
      s.status AS abonnement_statut,
      s.created_at::text AS abonnement_debut,
      s.current_period_end::text AS abonnement_fin,
      COALESCE(c.solde, 0)::int AS solde_credits,
      sc.stripe_customer_id
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    LEFT JOIN LATERAL (
      SELECT plan_slug, status, created_at, current_period_end FROM subscriptions
      WHERE user_id = u.id
      ORDER BY (status IN ('active', 'trialing')) DESC, updated_at DESC
      LIMIT 1
    ) s ON true
    LEFT JOIN LATERAL (
      SELECT SUM(credits_remaining) AS solde FROM credit_lots
      WHERE user_id = u.id AND credits_remaining > 0 AND (expires_at IS NULL OR expires_at > now())
    ) c ON true
    LEFT JOIN stripe_customers sc ON sc.user_id = u.id
    ORDER BY p.created_at DESC NULLS LAST
    LIMIT ${limit}
  `;
}

export type AdminStats = {
  totalUsers: number;
  activeSubscriptions: number;
  subscriptionsByPlan: { plan_slug: string; count: number }[];
};

export async function getAdminStats(): Promise<AdminStats> {
  const sql = requireDb();
  const [totalRow] = await sql<{ count: string }[]>`SELECT COUNT(*)::text AS count FROM users`;
  const parPlan = await sql<{ plan_slug: string; count: string }[]>`
    SELECT plan_slug, COUNT(*)::text AS count FROM subscriptions
    WHERE status IN ('active', 'trialing')
    GROUP BY plan_slug
  `;
  return {
    totalUsers: Number(totalRow?.count ?? 0),
    activeSubscriptions: parPlan.reduce((somme, r) => somme + Number(r.count), 0),
    subscriptionsByPlan: parPlan.map((r) => ({ plan_slug: r.plan_slug, count: Number(r.count) })),
  };
}
