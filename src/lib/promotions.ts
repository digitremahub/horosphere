// Offres de lancement — septembre 2026 uniquement. Les trois s'arrêtent au
// même instant (30 septembre 2026, 23:59:59 heure de Paris), y compris le
// bonus "100 premiers abonnés" si le quota n'est pas atteint avant.
//
// - 10% sur chaque pack de crédits (coupon Stripe "promo-septembre-2026",
//   créé côté Stripe avec la même date d'expiration — voir /api/checkout).
// - x2 crédits sur le premier mois d'abonnement, pour les 100 premiers
//   abonnés seulement (voir /api/stripe/webhook).
// - 10 crédits de bienvenue à l'inscription (au lieu de 3), mais valables
//   7 jours seulement au lieu des 45 jours habituels — une urgence
//   délibérée, pas un cadeau à traîner (voir lib/auth.ts).

import { requireDb } from './db';
import { WELCOME_CREDITS, CREDIT_EXPIRY_DAYS } from './pricing';

const PROMO_DEBUT = new Date('2026-09-01T00:00:00+02:00');
const PROMO_FIN = new Date('2026-10-01T00:00:00+02:00'); // exclusif

export function promoSeptembre2026Active(date: Date = new Date()): boolean {
  return date >= PROMO_DEBUT && date < PROMO_FIN;
}

/** Identifiant du coupon Stripe -10% (créé une seule fois côté Stripe, avec
 * la même date d'expiration que PROMO_FIN) — voir /api/checkout. */
export const COUPON_PACK_SEPTEMBRE_2026 = 'promo-septembre-2026';

/** Crédits de bienvenue à l'inscription : 10 au lieu de 3 pendant la promo
 * de lancement, utilisables seulement 7 jours plutôt que les 45 jours
 * habituels des packs. En dehors de la fenêtre promo, comportement inchangé. */
export function creditsBienvenue(date: Date = new Date()): { credits: number; expirationJours: number; source: string } {
  if (promoSeptembre2026Active(date)) {
    return { credits: 10, expirationJours: 7, source: 'signup:bienvenue-promo-sept2026' };
  }
  return { credits: WELCOME_CREDITS, expirationJours: CREDIT_EXPIRY_DAYS, source: 'signup:bienvenue' };
}

export const PREMIERS_ABONNES_QUOTA = 100;

/** Nombre de places restantes sur le bonus "100 premiers abonnés" — pour
 * l'afficher sur /tarifs. Renvoie le quota complet si la table n'existe pas
 * encore (jamais une erreur qui casserait l'affichage de la page). */
export async function premiersAbonnesRestants(): Promise<number> {
  const sql = requireDb();
  try {
    const rows = await sql<{ count: string }[]>`SELECT count(*) FROM promo_premiers_abonnes`;
    return Math.max(0, PREMIERS_ABONNES_QUOTA - Number(rows[0]?.count ?? 0));
  } catch {
    return PREMIERS_ABONNES_QUOTA;
  }
}

/** Réserve le bonus "100 premiers abonnés" (x2 crédits, premier mois
 * seulement) pour cet utilisateur — atomique et sans double octroi : un
 * INSERT conditionné au nombre de bénéficiaires déjà enregistrés, avec
 * user_id en clé primaire pour qu'un réabonnement ultérieur ne redouble
 * jamais les crédits une seconde fois. Renvoie true seulement si cet
 * utilisateur fait partie des 100 premiers à en bénéficier. */
export async function reserverBonusPremiersAbonnes(userId: number): Promise<boolean> {
  const sql = requireDb();
  try {
    const rows = await sql<{ user_id: number }[]>`
      INSERT INTO promo_premiers_abonnes (user_id)
      SELECT ${userId}::integer
      WHERE (SELECT count(*) FROM promo_premiers_abonnes) < ${PREMIERS_ABONNES_QUOTA}
      ON CONFLICT (user_id) DO NOTHING
      RETURNING user_id
    `;
    return rows.length > 0;
  } catch (err) {
    // La table peut ne pas encore exister si db/schema.sql n'a pas été
    // rejoué — l'octroi normal des crédits d'abonnement ne doit jamais en
    // dépendre : pas de bonus plutôt qu'une erreur qui bloque tout.
    console.error('reserverBonusPremiersAbonnes failed (table absente ?)', err);
    return false;
  }
}
