import { NextRequest, NextResponse } from 'next/server';
import { dbConfigured } from '@/lib/db';
import { envoyerRappelsRenouvellement } from '@/lib/subscriptionRenewalReminder';

// Rappel quotidien, quelques jours avant le renouvellement d'un abonnement
// (voir lib/subscriptionRenewalReminder.ts) — tourné en accroche marketing,
// jamais en simple notification de facturation. Appelée par Vercel Cron
// (voir vercel.json), protégée par CRON_SECRET.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  if (!dbConfigured) {
    return NextResponse.json({ skipped: true, reason: 'DATABASE_URL non configurée' });
  }

  const resultat = await envoyerRappelsRenouvellement();
  return NextResponse.json({ ok: true, ...resultat });
}
