// Abonnement offert au parrain qui a fait venir 5 abonnés payants actifs
// depuis au moins 3 mois consécutifs — décision explicite de l'utilisateur :
// "tant que les abonnements des filleuls sont actifs" (donc réversible : un
// filleul qui résilie et fait repasser son parrain sous 5 lui retire la
// gratuité, automatiquement, sans intervention manuelle).
//
// Mécanisme choisi (décision explicite) : un coupon Stripe -100% appliqué
// directement sur l'abonnement du parrain tant que la condition tient — 0€
// facturé, sans jamais annuler ni recréer l'abonnement. Une tâche planifiée
// quotidienne (voir /api/cron/parrainage-abonnement) recalcule l'état de
// TOUS les abonnements actifs et applique/retire le coupon en conséquence.
//
// "3 mois consécutifs" est approximé par l'ancienneté ININTERROMPUE de la
// ligne `subscriptions` du filleul (status='active' depuis ≥ 3 mois) — un
// abonnement Stripe annulé puis repris crée une nouvelle ligne (nouvel id
// Stripe), donc une résiliation remet bien le compteur à zéro pour ce
// filleul, comme attendu.

import { requireDb } from './db';
import { stripeClient } from './stripe';

export const SEUIL_FILLEULS_ABONNES = 5;
export const MOIS_MINIMUM_FILLEUL = 3;

const COUPON_ID = 'parrainage-5-filleuls-gratuit';

let couponEnsured = false;

/** Le coupon est partagé par tous les parrains éligibles (immuable une fois
 * créé, comme tous les coupons Stripe) — pas besoin d'un coupon par
 * utilisateur, juste de l'appliquer/retirer sur l'abonnement concerné. */
async function ensureCoupon(): Promise<void> {
  if (couponEnsured) return;
  const stripe = stripeClient();
  try {
    await stripe.coupons.retrieve(COUPON_ID);
  } catch {
    await stripe.coupons.create({
      id: COUPON_ID,
      percent_off: 100,
      duration: 'forever',
      name: 'Abonnement offert — 5 filleuls actifs',
    });
  }
  couponEnsured = true;
}

let colonneEnsured = false;

async function ensureColonne(sql: ReturnType<typeof requireDb>): Promise<void> {
  if (colonneEnsured) return;
  await sql.unsafe(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS parrainage_gratuit BOOLEAN NOT NULL DEFAULT false`);
  colonneEnsured = true;
}

export type EtatParrainageAbonnement = {
  subscriptionId: string;
  userId: number;
  email: string;
  filleulsQualifies: number;
  eligible: boolean;
  gratuitActuellement: boolean;
};

/** État courant de CHAQUE abonnement actif vis-à-vis de ce dispositif —
 * combien de filleuls qualifiés il compte, et si le coupon est déjà
 * appliqué. Utilisé par la synchronisation (cron) et par le backoffice. */
export async function listerEtatsParrainageAbonnement(): Promise<EtatParrainageAbonnement[]> {
  const sql = requireDb();
  await ensureColonne(sql);
  const rows = await sql<{ subscription_id: string; user_id: number; email: string; parrainage_gratuit: boolean; filleuls_qualifies: string }[]>`
    SELECT s.id AS subscription_id, s.user_id, u.email, s.parrainage_gratuit,
      COUNT(DISTINCT fs.user_id) AS filleuls_qualifies
    FROM subscriptions s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN parrainages p ON p.parrain_user_id = s.user_id
    LEFT JOIN subscriptions fs ON fs.user_id = p.filleul_user_id
      AND fs.status = 'active'
      AND fs.created_at <= now() - interval '3 months'
    WHERE s.status = 'active'
    GROUP BY s.id, s.user_id, u.email, s.parrainage_gratuit
  `;
  return rows.map((r) => ({
    subscriptionId: r.subscription_id,
    userId: r.user_id,
    email: r.email,
    filleulsQualifies: Number(r.filleuls_qualifies),
    eligible: Number(r.filleuls_qualifies) >= SEUIL_FILLEULS_ABONNES,
    gratuitActuellement: r.parrainage_gratuit,
  }));
}

/** Recalcule tout et applique/retire le coupon Stripe là où l'état a
 * changé — idempotent, ne touche jamais un abonnement déjà dans le bon
 * état. Appelée par le cron quotidien, et manuellement depuis le
 * backoffice ("Recalculer maintenant"). */
export async function synchroniserParrainagesAbonnement(): Promise<{ actives: number; retirees: number; erreurs: number }> {
  const sql = requireDb();
  await ensureColonne(sql);
  await ensureCoupon();
  const stripe = stripeClient();

  const etats = await listerEtatsParrainageAbonnement();
  let actives = 0;
  let retirees = 0;
  let erreurs = 0;

  for (const etat of etats) {
    try {
      if (etat.eligible && !etat.gratuitActuellement) {
        await stripe.subscriptions.update(etat.subscriptionId, { coupon: COUPON_ID });
        await sql`UPDATE subscriptions SET parrainage_gratuit = true WHERE id = ${etat.subscriptionId}`;
        actives++;
      } else if (!etat.eligible && etat.gratuitActuellement) {
        await stripe.subscriptions.deleteDiscount(etat.subscriptionId).catch(() => {});
        await sql`UPDATE subscriptions SET parrainage_gratuit = false WHERE id = ${etat.subscriptionId}`;
        retirees++;
      }
    } catch (err) {
      erreurs++;
      console.error('synchroniserParrainagesAbonnement: échec pour', etat.subscriptionId, err);
    }
  }

  return { actives, retirees, erreurs };
}
