// Tirage au sort du grand prix du calendrier de l'avent (case du 24
// décembre : 1 an d'abonnement offert) — déclenché à la main une seule
// fois, après le 24, plutôt qu'un cron (un tirage n'a rien de récurrent).
// Protégé par le même secret que les autres routes d'automatisation.
//
// Le prix : un coupon Stripe 100% de réduction, valable 12 mois
// (duration: 'repeating'), appliqué directement à l'abonnement actif du
// gagnant — pas de virement ni de geste manuel supplémentaire à faire.
// tirage_gagnants (year en clé primaire) empêche de rejouer le tirage deux
// fois par erreur pour la même année.

import { NextRequest, NextResponse } from 'next/server';
import { hasValidAutomationSecret } from '@/lib/automationAuth';
import { requireDb, dbConfigured } from '@/lib/db';
import { stripeClient, stripeConfigured } from '@/lib/stripe';

export async function GET(req: NextRequest) {
  const bySecretParam = new URL(req.url).searchParams.get('secret');
  const authorized = hasValidAutomationSecret(req) || (!!bySecretParam && bySecretParam === process.env.SOCIAL_AUTOMATION_SECRET);
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  if (!dbConfigured) return NextResponse.json({ error: "La base de données n'est pas configurée." }, { status: 503 });
  if (!stripeConfigured) return NextResponse.json({ error: "Stripe n'est pas configuré." }, { status: 503 });

  const anneeParam = new URL(req.url).searchParams.get('year');
  const annee = anneeParam ? Number(anneeParam) : new Date().getUTCFullYear();

  const sql = requireDb();

  const dejaTire = await sql<{ user_id: number }[]>`SELECT user_id FROM tirage_gagnants WHERE year = ${annee}`;
  if (dejaTire.length > 0) {
    return NextResponse.json({ error: `Le tirage ${annee} a déjà eu lieu.`, gagnantUserId: dejaTire[0].user_id }, { status: 409 });
  }

  const gagnant = await sql<{ user_id: number }[]>`
    SELECT user_id FROM tirage_avent WHERE year = ${annee} ORDER BY random() LIMIT 1
  `;
  if (gagnant.length === 0) {
    return NextResponse.json({ error: `Aucun participant inscrit au tirage ${annee}.` }, { status: 404 });
  }
  const gagnantUserId = gagnant[0].user_id;

  const abonnement = await sql<{ id: string }[]>`
    SELECT id FROM subscriptions
    WHERE user_id = ${gagnantUserId} AND status IN ('active', 'trialing')
    LIMIT 1
  `;
  if (abonnement.length === 0) {
    // Le gagnant était abonné au moment de sa participation mais ne l'est
    // plus au moment du tirage — cas rare, à traiter à la main.
    return NextResponse.json({
      error: "Le gagnant tiré au sort n'a plus d'abonnement actif — à traiter manuellement.",
      gagnantUserId,
    }, { status: 422 });
  }

  const stripe = stripeClient();
  const coupon = await stripe.coupons.create({
    percent_off: 100,
    duration: 'repeating',
    duration_in_months: 12,
    name: `Calendrier de l'avent ${annee} — grand prix`,
  });
  await stripe.subscriptions.update(abonnement[0].id, { coupon: coupon.id });

  await sql`
    INSERT INTO tirage_gagnants (year, user_id, stripe_coupon_id)
    VALUES (${annee}, ${gagnantUserId}, ${coupon.id})
  `;

  return NextResponse.json({ ok: true, annee, gagnantUserId, stripeCouponId: coupon.id });
}
