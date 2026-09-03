import Stripe from 'stripe';

let client: Stripe | null = null;

export function stripeClient(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY n'est pas configurée.");
  }
  client = new Stripe(key, { apiVersion: '2024-06-20' });
  return client;
}

export const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
