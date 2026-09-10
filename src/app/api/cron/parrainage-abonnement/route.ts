import { NextRequest, NextResponse } from 'next/server';
import { dbConfigured } from '@/lib/db';
import { stripeConfigured } from '@/lib/stripe';
import { synchroniserParrainagesAbonnement } from '@/lib/referralSubscription';

// Recalcul quotidien : applique le coupon Stripe -100% aux parrains qui
// viennent d'atteindre 5 filleuls abonnés actifs depuis 3 mois, et le
// retire à ceux qui viennent d'en repasser sous 5 (filleul résilié) — voir
// lib/referralSubscription.ts. Appelée par Vercel Cron (voir vercel.json),
// protégée par CRON_SECRET.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  if (!dbConfigured || !stripeConfigured) {
    return NextResponse.json({ skipped: true, reason: 'Base de données ou Stripe non configuré(e)' });
  }

  const resultat = await synchroniserParrainagesAbonnement();
  return NextResponse.json({ ok: true, ...resultat });
}
