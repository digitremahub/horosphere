// Offrir des mois d'abonnement gratuits depuis le backoffice.
//
// Cas 1 — la personne a déjà un abonnement actif/en essai : on prolonge sa
// période en cours via `trial_end` (le mécanisme standard de Stripe pour
// repousser la prochaine facturation sans rien débiter entre-temps). La
// table `subscriptions` locale reste synchronisée par le webhook
// `customer.subscription.updated` ; on la met aussi à jour ici directement
// pour un retour immédiat dans le tableau du backoffice.
//
// Cas 2 — la personne n'est PAS abonnée : on crée un tout nouvel abonnement
// Stripe, en période d'essai pour la durée offerte (aucun débit). Aucune
// facture n'est émise pendant un essai, donc le webhook qui accorde
// normalement les crédits mensuels (invoice.payment_succeeded) ne se
// déclenche pas ici — les crédits des mois offerts sont donc accordés
// directement, une fois, à la création. Sans moyen de paiement enregistré
// par la personne avant la fin de l'essai, Stripe ne pourra pas prélever le
// mois suivant et l'abonnement s'arrêtera de lui-même (voir le message
// renvoyé, affiché tel quel dans le backoffice).

import { requireDb } from './db';
import { stripeClient } from './stripe';
import { grantSubscriptionCredits } from './credits';
import { SUBSCRIPTIONS } from './pricing';

export type OffreAbonnementResult = { ok: boolean; message: string };

async function getOrCreateCustomer(userId: number, email: string): Promise<string> {
  const sql = requireDb();
  const existing = await sql<{ stripe_customer_id: string }[]>`
    SELECT stripe_customer_id FROM stripe_customers WHERE user_id = ${userId}
  `;
  if (existing[0]) return existing[0].stripe_customer_id;

  const stripe = stripeClient();
  const customer = await stripe.customers.create({ email, metadata: { horosphereUserId: String(userId) } });
  await sql`
    INSERT INTO stripe_customers (user_id, stripe_customer_id) VALUES (${userId}, ${customer.id})
    ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = EXCLUDED.stripe_customer_id
  `;
  return customer.id;
}

export async function offrirMoisAbonnement(userId: number, mois: number, planSlug?: string): Promise<OffreAbonnementResult> {
  if (!Number.isFinite(mois) || mois <= 0 || mois > 12) {
    return { ok: false, message: 'Nombre de mois invalide (entre 1 et 12).' };
  }

  const sql = requireDb();
  const stripe = stripeClient();
  const [abonnementActif] = await sql<{ id: string }[]>`
    SELECT id FROM subscriptions
    WHERE user_id = ${userId} AND status IN ('active', 'trialing')
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  if (abonnementActif) {
    // Cas 1 : prolonge l'abonnement en cours. On repart de la vraie date de
    // fin de période côté Stripe (source de vérité) plutôt que de notre
    // copie locale, potentiellement en retard de quelques secondes si un
    // webhook est encore en vol.
    const sub = await stripe.subscriptions.retrieve(abonnementActif.id);
    const periodEndMs = ((sub as unknown as { current_period_end: number }).current_period_end) * 1000;
    const base = Math.max(periodEndMs, Date.now());
    const nouvelleEcheance = new Date(base);
    nouvelleEcheance.setMonth(nouvelleEcheance.getMonth() + mois);
    const trialEndUnix = Math.floor(nouvelleEcheance.getTime() / 1000);

    await stripe.subscriptions.update(abonnementActif.id, { trial_end: trialEndUnix, proration_behavior: 'none' });
    await sql`
      UPDATE subscriptions SET status = 'trialing', current_period_end = ${nouvelleEcheance.toISOString()}, updated_at = now()
      WHERE id = ${abonnementActif.id}
    `;
    return {
      ok: true,
      message: `${mois} mois offert${mois > 1 ? 's' : ''} sur l'abonnement en cours — prochaine échéance le ${nouvelleEcheance.toLocaleDateString('fr-FR')}.`,
    };
  }

  // Cas 2 : aucun abonnement actif — en créer un nouveau, gratuit pour la
  // durée choisie.
  if (!planSlug) {
    return { ok: false, message: "Cet utilisateur n'a pas d'abonnement actif : choisissez un forfait à lui offrir." };
  }
  const plan = SUBSCRIPTIONS.find((p) => p.slug === planSlug);
  if (!plan) {
    return { ok: false, message: 'Forfait inconnu.' };
  }
  const priceId = process.env[plan.envKey];
  if (!priceId) {
    return { ok: false, message: `Le Price Stripe pour "${planSlug}" n'est pas configuré (variable ${plan.envKey}).` };
  }

  const [utilisateur] = await sql<{ email: string }[]>`SELECT email FROM users WHERE id = ${userId}`;
  if (!utilisateur) {
    return { ok: false, message: 'Utilisateur introuvable.' };
  }

  const customerId = await getOrCreateCustomer(userId, utilisateur.email);
  const sub = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    trial_period_days: mois * 30,
    metadata: { horosphereUserId: String(userId), kind: 'sub', slug: plan.slug, credits: String(plan.creditsParMois) },
  });

  // Aucune facture pendant l'essai : les crédits des mois offerts sont
  // accordés directement, en un seul lot (voir l'en-tête de ce fichier).
  await grantSubscriptionCredits(userId, plan.creditsParMois * mois, plan.slug, 'admin-offert');

  const periodEndMs = ((sub as unknown as { current_period_end: number }).current_period_end) * 1000;
  await sql`
    INSERT INTO subscriptions (id, user_id, plan_slug, status, current_period_end, updated_at)
    VALUES (${sub.id}, ${userId}, ${plan.slug}, ${sub.status}, ${new Date(periodEndMs)}, now())
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, current_period_end = EXCLUDED.current_period_end, updated_at = now()
  `;

  return {
    ok: true,
    message: `Nouvel abonnement "${plan.nom}" offert (${mois} mois gratuit${mois > 1 ? 's' : ''}, ${plan.creditsParMois * mois} crédits accordés). Sans carte enregistrée par l'utilisateur avant la fin de l'essai, l'abonnement s'arrêtera de lui-même ensuite.`,
  };
}
