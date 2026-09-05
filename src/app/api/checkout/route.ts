import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { stripeClient, stripeConfigured } from '@/lib/stripe';
import { requireDb, dbConfigured } from '@/lib/db';
import { CREDIT_PACKS, SUBSCRIPTIONS } from '@/lib/pricing';
import { promoSeptembre2026Active, COUPON_PACK_SEPTEMBRE_2026 } from '@/lib/promotions';

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

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const email = session?.user?.email;
  if (!session || !userId || !email) {
    return NextResponse.json({ error: 'Connecte-toi pour acheter des crédits.' }, { status: 401 });
  }
  if (!stripeConfigured || !dbConfigured) {
    return NextResponse.json({ error: "Le paiement n'est pas encore configuré." }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const kind = body.kind as 'pack' | 'sub';
  const slug = body.slug as string;

  const pack = kind === 'pack' ? CREDIT_PACKS.find((p) => p.slug === slug) : undefined;
  const plan = kind === 'sub' ? SUBSCRIPTIONS.find((p) => p.slug === slug) : undefined;

  if (!pack && !plan) {
    return NextResponse.json({ error: 'Forfait inconnu.' }, { status: 400 });
  }

  const priceId = process.env[(pack ?? plan)!.envKey];
  if (!priceId) {
    return NextResponse.json(
      { error: `Le Price Stripe pour "${slug}" n'est pas configuré (variable ${(pack ?? plan)!.envKey}).` },
      { status: 503 }
    );
  }

  const stripe = stripeClient();
  const uid = Number(userId);
  const customerId = await getOrCreateCustomer(uid, email);

  const origin = req.headers.get('origin') || `https://${req.headers.get('host')}`;

  // Promo de lancement (septembre 2026) : -10% sur les packs, appliqué
  // automatiquement (pas de code à saisir) tant que le coupon Stripe reste
  // valide — voir lib/promotions.ts. Ne concerne que les packs (paiement
  // unique) ; les abonnements ont leur propre offre (voir /api/stripe/webhook).
  const discounts = pack && promoSeptembre2026Active() ? [{ coupon: COUPON_PACK_SEPTEMBRE_2026 }] : undefined;

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: pack ? 'payment' : 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    discounts,
    success_url: `${origin}/app?checkout=success`,
    cancel_url: `${origin}/tarifs?checkout=annule`,
    metadata: pack
      ? { horosphereUserId: String(uid), kind: 'pack', slug: pack.slug, credits: String(pack.credits) }
      : { horosphereUserId: String(uid), kind: 'sub', slug: plan!.slug, credits: String(plan!.creditsParMois) },
    subscription_data: plan
      ? { metadata: { horosphereUserId: String(uid), kind: 'sub', slug: plan.slug, credits: String(plan.creditsParMois) } }
      : undefined,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
