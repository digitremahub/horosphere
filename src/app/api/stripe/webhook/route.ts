import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripeClient } from '@/lib/stripe';
import { requireDb } from '@/lib/db';
import { grantPackCredits, grantSubscriptionCredits } from '@/lib/credits';

export const runtime = 'nodejs';

async function alreadyProcessed(eventId: string): Promise<boolean> {
  const sql = requireDb();
  try {
    await sql`INSERT INTO processed_stripe_events (id) VALUES (${eventId})`;
    return false;
  } catch {
    // Violation de contrainte unique : déjà traité.
    return true;
  }
}

async function upsertSubscription(sub: Stripe.Subscription, userId: number, planSlug: string) {
  const sql = requireDb();
  const periodEnd = (sub as any).current_period_end ? new Date((sub as any).current_period_end * 1000) : null;
  await sql`
    INSERT INTO subscriptions (id, user_id, plan_slug, status, current_period_end, updated_at)
    VALUES (${sub.id}, ${userId}, ${planSlug}, ${sub.status}, ${periodEnd}, now())
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, current_period_end = EXCLUDED.current_period_end, updated_at = now()
  `;
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook non configuré.' }, { status: 503 });
  }

  const rawBody = await req.text();
  const stripe = stripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Signature Stripe invalide', err);
    return NextResponse.json({ error: 'Signature invalide.' }, { status: 400 });
  }

  if (await alreadyProcessed(event.id)) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const cs = event.data.object as Stripe.Checkout.Session;
        if (cs.mode === 'payment' && cs.metadata?.kind === 'pack') {
          const userId = Number(cs.metadata.horosphereUserId);
          const credits = Number(cs.metadata.credits);
          const slug = cs.metadata.slug;
          await grantPackCredits(userId, credits, slug);
        }
        // Pour les abonnements, les crédits sont accordés via
        // invoice.payment_succeeded (couvre le premier paiement et chaque
        // renouvellement de la même façon).
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as any).subscription as string | null;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          const userId = Number(sub.metadata?.horosphereUserId);
          const credits = Number(sub.metadata?.credits);
          const slug = sub.metadata?.slug || 'inconnu';
          if (userId && credits) {
            const periodLabel = new Date((sub as any).current_period_start * 1000).toISOString().slice(0, 7);
            await grantSubscriptionCredits(userId, credits, slug, periodLabel);
            await upsertSubscription(sub, userId, slug);
          }
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = Number(sub.metadata?.horosphereUserId);
        const slug = sub.metadata?.slug || 'inconnu';
        if (userId) {
          await upsertSubscription(sub, userId, slug);
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error(`Erreur en traitant l'event Stripe ${event.type}`, err);
    return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
