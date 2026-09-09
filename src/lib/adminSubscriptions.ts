// Offrir des mois d'abonnement gratuits depuis le backoffice — prolonge la
// période en cours d'un abonnement Stripe existant via `trial_end` (le
// mécanisme standard de Stripe pour repousser la prochaine facturation sans
// rien débiter entre-temps). La table `subscriptions` locale reste
// synchronisée par le webhook `customer.subscription.updated` (voir
// /api/stripe/webhook) ; on la met aussi à jour ici directement pour un
// retour immédiat dans le tableau du backoffice, sans attendre l'aller-
// retour du webhook.

import { requireDb } from './db';
import { stripeClient } from './stripe';

export type OffreAbonnementResult = { ok: boolean; message: string };

export async function offrirMoisAbonnement(userId: number, mois: number): Promise<OffreAbonnementResult> {
  if (!Number.isFinite(mois) || mois <= 0 || mois > 12) {
    return { ok: false, message: 'Nombre de mois invalide (entre 1 et 12).' };
  }

  const sql = requireDb();
  const [row] = await sql<{ id: string }[]>`
    SELECT id FROM subscriptions
    WHERE user_id = ${userId} AND status IN ('active', 'trialing')
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  if (!row) {
    return { ok: false, message: "Cet utilisateur n'a pas d'abonnement actif à prolonger." };
  }

  const stripe = stripeClient();
  // On repart de la vraie date de fin de période côté Stripe (source de
  // vérité) plutôt que de notre copie locale, potentiellement en retard de
  // quelques secondes si un webhook est encore en vol.
  const sub = await stripe.subscriptions.retrieve(row.id);
  const periodEndMs = ((sub as unknown as { current_period_end: number }).current_period_end) * 1000;
  const base = Math.max(periodEndMs, Date.now());
  const nouvelleEcheance = new Date(base);
  nouvelleEcheance.setMonth(nouvelleEcheance.getMonth() + mois);
  const trialEndUnix = Math.floor(nouvelleEcheance.getTime() / 1000);

  await stripe.subscriptions.update(row.id, { trial_end: trialEndUnix, proration_behavior: 'none' });

  await sql`
    UPDATE subscriptions SET status = 'trialing', current_period_end = ${nouvelleEcheance.toISOString()}, updated_at = now()
    WHERE id = ${row.id}
  `;

  return {
    ok: true,
    message: `${mois} mois offert${mois > 1 ? 's' : ''} — prochaine échéance le ${nouvelleEcheance.toLocaleDateString('fr-FR')}.`,
  };
}
