// Cadeau d'anniversaire des abonnés — une fois par an, pendant le mois de
// naissance d'un abonné actif, la dernière facture payée de son abonnement
// est intégralement remboursée via Stripe, puis expliquée par e-mail (pas
// d'annonce ailleurs sur le site — la surprise reste dans la découverte du
// remboursement sur le relevé bancaire, l'e-mail arrive juste derrière pour
// lever toute ambiguïté). Appelé par un cron quotidien (voir
// /api/cron/birthday-refunds) — idempotent grâce à birthday_refunds
// (user_id, year), donc rejouable sans risque de double remboursement ni de
// double e-mail.

import { requireDb } from './db';
import { stripeClient } from './stripe';

const RESEND_API_URL = 'https://api.resend.com/emails';

function buildEmailHtml(prenom: string, montantEuros: string): string {
  return `
    <table width="100%" style="max-width:560px;margin:0 auto;font-family:Arial,sans-serif;color:#1a1a1a;">
      <tr><td style="padding-bottom:20px;">
        <div style="font-family:Georgia,serif;font-style:italic;font-size:22px;">Horosphère</div>
      </td></tr>
      <tr><td style="padding-bottom:10px;font-size:17px;">🎂 Joyeux anniversaire${prenom ? `, ${prenom}` : ''} !</td></tr>
      <tr><td style="padding-bottom:14px;font-size:15px;">
        Pour marquer le coup, on vous offre votre abonnement de ce mois-ci : <strong>${montantEuros} € viennent de vous être remboursés</strong>, directement sur le moyen de paiement utilisé. Rien à faire de votre côté, c'est déjà fait.
      </td></tr>
      <tr><td style="padding-bottom:14px;font-size:15px;">
        Merci de faire partie de l'aventure Horosphère — on vous souhaite une belle journée, et une belle année à venir.
      </td></tr>
      <tr><td style="padding-top:8px;font-size:12px;color:#9a9a9a;">
        Ce remboursement peut mettre quelques jours à apparaître selon votre banque.
      </td></tr>
    </table>`;
}

async function envoyerEmailAnniversaire(email: string, prenom: string, montantCents: number): Promise<void> {
  const apiKey = process.env.AUTH_RESEND_KEY || process.env.RESEND_API_KEY;
  if (!apiKey) return; // pas de clé configurée : le remboursement a quand même eu lieu, seul l'e-mail est sauté
  const from = process.env.EMAIL_FROM || 'Horosphère <onboarding@resend.dev>';
  const montantEuros = (montantCents / 100).toFixed(2).replace('.', ',');

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from,
      to: email,
      subject: '🎂 Un cadeau d\'anniversaire de la part d\'Horosphère',
      html: buildEmailHtml(prenom, montantEuros),
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend a refusé l'envoi (${res.status}): ${detail.slice(0, 300)}`);
  }
}

export type BirthdayRefundResult = { traites: number; rembourses: number; erreurs: number };

export async function rembourserAnniversairesDuMois(): Promise<BirthdayRefundResult> {
  const sql = requireDb();
  const stripe = stripeClient();
  const now = new Date();
  const mois = now.getUTCMonth() + 1;
  const annee = now.getUTCFullYear();

  const abonnes = await sql<{ user_id: number; sub_id: string; email: string; prenom: string }[]>`
    SELECT s.user_id, s.id AS sub_id, u.email, p.prenom
    FROM subscriptions s
    JOIN profiles p ON p.user_id = s.user_id
    JOIN users u ON u.id = s.user_id
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

      try {
        await envoyerEmailAnniversaire(abonne.email, abonne.prenom, invoice.amount_paid);
      } catch (err) {
        // L'e-mail est secondaire au remboursement lui-même : un échec
        // d'envoi ne doit jamais faire remonter d'erreur sur un
        // remboursement par ailleurs réussi.
        console.error(`E-mail anniversaire échoué pour l'utilisateur ${abonne.user_id}`, err);
      }
    } catch (err) {
      console.error(`Remboursement anniversaire échoué pour l'utilisateur ${abonne.user_id}`, err);
      erreurs += 1;
    }
  }

  return { traites: abonnes.length, rembourses, erreurs };
}
