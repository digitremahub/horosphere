// Cadeau d'anniversaire des abonnés — remboursement SILENCIEUX, sur demande
// explicite de l'utilisateur (aucune communication, nulle part : pas
// d'e-mail, pas de mention sur le site). Une fois par an, pendant le mois
// de naissance d'un abonné actif, la dernière facture payée de son
// abonnement est intégralement remboursée via Stripe. Appelé par un cron
// quotidien (voir /api/cron/birthday-refunds) — idempotent grâce à
// birthday_refunds (user_id, year), donc rejouable sans risque de double
// remboursement.
//
// Limite connue, hors du contrôle de ce code : Stripe peut envoyer sa
// propre notification de remboursement au client selon les réglages du
// compte (Dashboard Stripe → Paramètres → E-mails clients → "Remboursements
// réussis"). Pour un silence total, ce réglage doit être désactivé
// manuellement dans le Dashboard Stripe — voir README.

import { requireDb } from './db';
import { stripeClient } from './stripe';

export type BirthdayRefundResult = { traites: number; rembourses: number; erreurs: number };

export async function rembourserAnniversairesDuMois(): Promise<BirthdayRefundResult> {
  const sql = requireDb();
  const stripe = stripeClient();
  const now = new Date();
  const mois = now.getUTCMonth() + 1;
  const annee = now.getUTCFullYear();

  const abonnes = await sql<{ user_id: number; sub_id: string }[]>`
    SELECT s.user_id, s.id AS sub_id
    FROM subscriptions s
    JOIN profiles p ON p.user_id = s.user_id
    WHERE s.status IN ('active', 'trialing')
      AND EXTRACT(MONTH FROM p.date_naissance) = ${mois}
      AND NOT EXISTS (
        SELECT 1 FROM birthday_refunds br WHERE br.user_id = s.user_id AND br.year = ${annee}
      )
  `;

  let rembourses = 0;
  let erreurs = 0;

  for (const abonne of abonnes) {
    try {
      // On enregistre la tentative AVANT d'appeler Stripe (clé primaire
      // (user_id, year)) : si l'insertion échoue (déjà traité entre-temps,
      // ex. deux exécutions du cron qui se chevauchent), on n'appelle
      // jamais Stripe une seconde fois pour le même utilisateur.
      const reserve = await sql`
        INSERT INTO birthday_refunds (user_id, year)
        VALUES (${abonne.user_id}, ${annee})
        ON CONFLICT (user_id, year) DO NOTHING
        RETURNING user_id
      `;
      if (reserve.length === 0) continue;

      const invoices = await stripe.invoices.list({ subscription: abonne.sub_id, status: 'paid', limit: 1 });
      const invoice = invoices.data[0];
      // `payment_intent` est la référence actuelle recommandée par Stripe
      // pour un remboursement ; `charge` reste accepté en repli pour les
      // comptes/versions d'API plus anciens qui ne le renvoient pas.
      const paymentIntentId = invoice?.payment_intent as string | null | undefined;
      const chargeId = invoice?.charge as string | null | undefined;
      if (!invoice || (!paymentIntentId && !chargeId)) {
        // Rien à rembourser (ex. abonnement en essai gratuit, aucune
        // facture payée pour l'instant) — la réservation reste en place
        // pour ne pas retenter inutilement chaque jour du mois.
        continue;
      }

      const refund = await stripe.refunds.create(
        paymentIntentId ? { payment_intent: paymentIntentId } : { charge: chargeId! }
      );
      await sql`
        UPDATE birthday_refunds
        SET stripe_refund_id = ${refund.id}, amount_cents = ${invoice.amount_paid}
        WHERE user_id = ${abonne.user_id} AND year = ${annee}
      `;
      rembourses += 1;
    } catch (err) {
      console.error(`Remboursement anniversaire échoué pour l'utilisateur ${abonne.user_id}`, err);
      erreurs += 1;
    }
  }

  return { traites: abonnes.length, rembourses, erreurs };
}
