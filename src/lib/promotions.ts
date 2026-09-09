// Promotions — gérées depuis le backoffice (/app/admin), une ligne par
// campagne dans la table `promotions` plutôt que codées en dur comme
// avant. Au plus une promotion "active" à la fois (celle dont la fenêtre
// [debut, fin) contient l'instant présent) ; c'est elle qui pilote les
// trois effets pris en charge :
//   - reductionPourcent : -X% sur les packs de crédits (coupon Stripe créé
//     automatiquement à la sauvegarde, voir upsertPromotion).
//   - creditsBienvenue / creditsBienvenueJours : override du cadeau de
//     bienvenue à l'inscription (voir lib/auth.ts, événement createUser).
//   - bonusAbonnementMultiplicateur / bonusAbonnementQuota : crédits
//     multipliés sur le tout premier mois d'abonnement, pour les N premiers
//     bénéficiaires (voir /api/stripe/webhook) — quota illimité si vide.

import { requireDb } from './db';
import { stripeClient, stripeConfigured } from './stripe';
import { WELCOME_CREDITS, CREDIT_EXPIRY_DAYS } from './pricing';

export type Promotion = {
  id: number;
  nom: string;
  description: string;
  debut: Date;
  fin: Date;
  reductionPourcent: number | null;
  stripeCouponId: string | null;
  creditsBienvenue: number | null;
  creditsBienvenueJours: number | null;
  bonusAbonnementMultiplicateur: number | null;
  bonusAbonnementQuota: number | null;
};

type PromotionRow = {
  id: number;
  nom: string;
  description: string;
  debut: string;
  fin: string;
  reduction_pourcent: number | null;
  stripe_coupon_id: string | null;
  credits_bienvenue: number | null;
  credits_bienvenue_jours: number | null;
  bonus_abonnement_multiplicateur: number | null;
  bonus_abonnement_quota: number | null;
};

function fromRow(r: PromotionRow): Promotion {
  return {
    id: r.id,
    nom: r.nom,
    description: r.description,
    debut: new Date(r.debut),
    fin: new Date(r.fin),
    reductionPourcent: r.reduction_pourcent,
    stripeCouponId: r.stripe_coupon_id,
    creditsBienvenue: r.credits_bienvenue,
    creditsBienvenueJours: r.credits_bienvenue_jours,
    bonusAbonnementMultiplicateur: r.bonus_abonnement_multiplicateur,
    bonusAbonnementQuota: r.bonus_abonnement_quota,
  };
}

// Ancienne promotion de lancement (septembre 2026), jusqu'ici codée en dur
// avec un coupon Stripe créé manuellement et sa propre table de quota
// (promo_premiers_abonnes). Ces valeurs ne servent plus qu'à la
// semence ci-dessous, une seule fois, pour la faire apparaître comme une
// vraie ligne éditable plutôt que de perdre la campagne en cours au moment
// de brancher le backoffice.
const ANCIEN_COUPON_SEPTEMBRE_2026 = 'promo-septembre-2026';
const ANCIENNE_PROMO_SEPTEMBRE_2026 = {
  nom: 'Lancement septembre 2026',
  description:
    "-10% sur tous les packs de crédits · crédits doublés le 1er mois pour les 100 premiers abonnés · 10 crédits de bienvenue (valables 7 jours au lieu de 45)",
  debut: new Date('2026-09-01T00:00:00+02:00'),
  fin: new Date('2026-10-01T00:00:00+02:00'), // exclusif
  reductionPourcent: 10,
  creditsBienvenue: 10,
  creditsBienvenueJours: 7,
  bonusAbonnementMultiplicateur: 2,
  bonusAbonnementQuota: 100,
};

let schemaEnsured = false;

async function ensureSchema(sql: ReturnType<typeof requireDb>) {
  if (schemaEnsured) return;
  await sql.unsafe(`CREATE TABLE IF NOT EXISTS promotions (
    id SERIAL PRIMARY KEY,
    nom TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    debut TIMESTAMPTZ NOT NULL,
    fin TIMESTAMPTZ NOT NULL,
    reduction_pourcent INTEGER,
    stripe_coupon_id TEXT,
    credits_bienvenue INTEGER,
    credits_bienvenue_jours INTEGER,
    bonus_abonnement_multiplicateur INTEGER,
    bonus_abonnement_quota INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await sql.unsafe(`CREATE TABLE IF NOT EXISTS promo_abonnement_beneficiaires (
    promotion_id INTEGER NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (promotion_id, user_id)
  )`);
  schemaEnsured = true;

  // Semence unique de l'ancienne promo de lancement, gardée telle quelle
  // (même coupon Stripe déjà en usage, mêmes bénéficiaires déjà comptés) —
  // voir le commentaire au-dessus de ANCIENNE_PROMO_SEPTEMBRE_2026.
  const existe = await sql<{ id: number }[]>`SELECT id FROM promotions WHERE stripe_coupon_id = ${ANCIEN_COUPON_SEPTEMBRE_2026} LIMIT 1`;
  if (existe.length > 0) return;
  try {
    const [row] = await sql<{ id: number }[]>`
      INSERT INTO promotions (nom, description, debut, fin, reduction_pourcent, stripe_coupon_id, credits_bienvenue, credits_bienvenue_jours, bonus_abonnement_multiplicateur, bonus_abonnement_quota)
      VALUES (
        ${ANCIENNE_PROMO_SEPTEMBRE_2026.nom}, ${ANCIENNE_PROMO_SEPTEMBRE_2026.description},
        ${ANCIENNE_PROMO_SEPTEMBRE_2026.debut}, ${ANCIENNE_PROMO_SEPTEMBRE_2026.fin},
        ${ANCIENNE_PROMO_SEPTEMBRE_2026.reductionPourcent}, ${ANCIEN_COUPON_SEPTEMBRE_2026},
        ${ANCIENNE_PROMO_SEPTEMBRE_2026.creditsBienvenue}, ${ANCIENNE_PROMO_SEPTEMBRE_2026.creditsBienvenueJours},
        ${ANCIENNE_PROMO_SEPTEMBRE_2026.bonusAbonnementMultiplicateur}, ${ANCIENNE_PROMO_SEPTEMBRE_2026.bonusAbonnementQuota}
      )
      RETURNING id
    `;
    // Reprend les bénéficiaires déjà enregistrés sous l'ancien système
    // (table dédiée à cette seule promo) pour ne jamais recompter le quota
    // depuis zéro. Silencieux si cette ancienne table n'existe pas/plus.
    await sql`
      INSERT INTO promo_abonnement_beneficiaires (promotion_id, user_id)
      SELECT ${row.id}, user_id FROM promo_premiers_abonnes
      ON CONFLICT DO NOTHING
    `.catch(() => {});
  } catch (err) {
    console.error('Semence de la promo de lancement septembre 2026 échouée', err);
  }
}

export async function listPromotions(): Promise<Promotion[]> {
  const sql = requireDb();
  await ensureSchema(sql);
  const rows = await sql<PromotionRow[]>`SELECT * FROM promotions ORDER BY debut DESC`;
  return rows.map(fromRow);
}

export async function getActivePromotion(date: Date = new Date()): Promise<Promotion | null> {
  const sql = requireDb();
  await ensureSchema(sql);
  const rows = await sql<PromotionRow[]>`
    SELECT * FROM promotions WHERE debut <= ${date} AND fin > ${date}
    ORDER BY created_at DESC LIMIT 1
  `;
  return rows[0] ? fromRow(rows[0]) : null;
}

/** Places restantes sur le bonus abonnement d'une promotion (`null` si le
 * bonus n'a pas de quota — illimité). Ne casse jamais l'affichage : renvoie
 * le quota complet si la lecture échoue. */
export async function bonusAbonnementRestant(promo: Promotion): Promise<number | null> {
  if (promo.bonusAbonnementQuota == null) return null;
  const sql = requireDb();
  try {
    const [row] = await sql<{ count: string }[]>`
      SELECT count(*) FROM promo_abonnement_beneficiaires WHERE promotion_id = ${promo.id}
    `;
    return Math.max(0, promo.bonusAbonnementQuota - Number(row?.count ?? 0));
  } catch {
    return promo.bonusAbonnementQuota;
  }
}

/** Réserve le bonus abonnement de cette promotion pour cet utilisateur —
 * atomique, sans double octroi (un réabonnement ultérieur ne redouble
 * jamais le bonus), quota illimité si `bonusAbonnementQuota` est vide.
 * Renvoie true seulement si le bonus est bien accordé. */
export async function reserverBonusAbonnement(promotionId: number, userId: number, quota: number | null): Promise<boolean> {
  const sql = requireDb();
  try {
    const rows = await sql<{ user_id: number }[]>`
      INSERT INTO promo_abonnement_beneficiaires (promotion_id, user_id)
      SELECT ${promotionId}::integer, ${userId}::integer
      WHERE ${quota === null}::boolean OR (SELECT count(*) FROM promo_abonnement_beneficiaires WHERE promotion_id = ${promotionId}) < ${quota ?? 0}
      ON CONFLICT (promotion_id, user_id) DO NOTHING
      RETURNING user_id
    `;
    return rows.length > 0;
  } catch (err) {
    console.error('reserverBonusAbonnement échoué', err);
    return false;
  }
}

/** Crédits de bienvenue à l'inscription — ceux de la promotion active si
 * elle en définit, sinon les valeurs par défaut du site (voir
 * lib/pricing.ts). Ne bloque jamais l'inscription : repli sur les valeurs
 * par défaut si la lecture de la promotion échoue. */
export async function resolveWelcomeCredits(date: Date = new Date()): Promise<{ credits: number; expirationJours: number; source: string }> {
  try {
    const promo = await getActivePromotion(date);
    if (promo?.creditsBienvenue != null && promo.creditsBienvenueJours != null) {
      return { credits: promo.creditsBienvenue, expirationJours: promo.creditsBienvenueJours, source: `signup:bienvenue-promo-${promo.id}` };
    }
  } catch (err) {
    console.error('resolveWelcomeCredits: lecture de la promotion active échouée', err);
  }
  return { credits: WELCOME_CREDITS, expirationJours: CREDIT_EXPIRY_DAYS, source: 'signup:bienvenue' };
}

export type PromotionInput = {
  nom: string;
  description: string;
  debut: Date;
  fin: Date;
  reductionPourcent: number | null;
  creditsBienvenue: number | null;
  creditsBienvenueJours: number | null;
  bonusAbonnementMultiplicateur: number | null;
  bonusAbonnementQuota: number | null;
};

/** Crée (ou recrée) le coupon Stripe correspondant à la réduction sur les
 * packs — les coupons Stripe sont immuables (pourcentage et date de fin ne
 * se modifient pas après coup), donc tout changement de `reductionPourcent`
 * ou de `fin` en crée un nouveau plutôt que d'essayer d'éditer l'existant ;
 * l'ancien, s'il y en avait un, reste simplement inutilisé (jamais
 * supprimé : un coupon déjà appliqué à une facture passée doit rester
 * consultable côté Stripe). */
async function creerCouponSiBesoin(reductionPourcent: number | null, fin: Date): Promise<string | null> {
  if (!reductionPourcent) return null;
  if (!stripeConfigured) return null;
  const stripe = stripeClient();
  const coupon = await stripe.coupons.create({
    percent_off: reductionPourcent,
    duration: 'once',
    redeem_by: Math.floor(fin.getTime() / 1000),
  });
  return coupon.id;
}

export async function createPromotion(input: PromotionInput): Promise<Promotion> {
  const sql = requireDb();
  await ensureSchema(sql);
  const stripeCouponId = await creerCouponSiBesoin(input.reductionPourcent, input.fin);
  const [row] = await sql<PromotionRow[]>`
    INSERT INTO promotions (nom, description, debut, fin, reduction_pourcent, stripe_coupon_id, credits_bienvenue, credits_bienvenue_jours, bonus_abonnement_multiplicateur, bonus_abonnement_quota)
    VALUES (${input.nom}, ${input.description}, ${input.debut}, ${input.fin}, ${input.reductionPourcent}, ${stripeCouponId}, ${input.creditsBienvenue}, ${input.creditsBienvenueJours}, ${input.bonusAbonnementMultiplicateur}, ${input.bonusAbonnementQuota})
    RETURNING *
  `;
  return fromRow(row);
}

export async function updatePromotion(id: number, input: PromotionInput): Promise<Promotion> {
  const sql = requireDb();
  await ensureSchema(sql);
  const [existante] = await sql<PromotionRow[]>`SELECT * FROM promotions WHERE id = ${id}`;
  const changeReduction = !existante || existante.reduction_pourcent !== input.reductionPourcent || new Date(existante.fin).getTime() !== input.fin.getTime();
  const stripeCouponId = changeReduction ? await creerCouponSiBesoin(input.reductionPourcent, input.fin) : existante.stripe_coupon_id;

  const [row] = await sql<PromotionRow[]>`
    UPDATE promotions SET
      nom = ${input.nom},
      description = ${input.description},
      debut = ${input.debut},
      fin = ${input.fin},
      reduction_pourcent = ${input.reductionPourcent},
      stripe_coupon_id = ${stripeCouponId},
      credits_bienvenue = ${input.creditsBienvenue},
      credits_bienvenue_jours = ${input.creditsBienvenueJours},
      bonus_abonnement_multiplicateur = ${input.bonusAbonnementMultiplicateur},
      bonus_abonnement_quota = ${input.bonusAbonnementQuota},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return fromRow(row);
}

export async function deletePromotion(id: number): Promise<void> {
  const sql = requireDb();
  await ensureSchema(sql);
  await sql`DELETE FROM promotions WHERE id = ${id}`;
}
