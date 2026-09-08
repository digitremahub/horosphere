import { NextRequest, NextResponse } from 'next/server';
import { dbConfigured } from '@/lib/db';
import { stripeConfigured } from '@/lib/stripe';
import { rembourserAnniversairesDuMois } from '@/lib/birthdayRefund';

// Cadeau d'anniversaire silencieux des abonnés (voir lib/birthdayRefund.ts)
// — appelée quotidiennement par Vercel Cron (voir vercel.json), protégée
// par CRON_SECRET comme les autres tâches planifiées.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  if (!dbConfigured) {
    return NextResponse.json({ skipped: true, reason: 'DATABASE_URL non configurée' });
  }
  if (!stripeConfigured) {
    return NextResponse.json({ skipped: true, reason: 'STRIPE_SECRET_KEY non configurée' });
  }

  try {
    const result = await rembourserAnniversairesDuMois();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('rembourserAnniversairesDuMois a échoué', err);
    return NextResponse.json({ error: 'Le remboursement anniversaire a échoué.' }, { status: 500 });
  }
}
