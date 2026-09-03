import { NextRequest, NextResponse } from 'next/server';
import { requireDb, dbConfigured } from '@/lib/db';

// Purge quotidienne : les soldes sont déjà filtrés par expires_at dans
// getBalance(), donc rien n'est jamais "faux" — mais on remet
// credits_remaining à 0 sur les lots expirés pour garder des rapports
// propres. Appelée par Vercel Cron (voir vercel.json), protégée par
// CRON_SECRET.

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  if (!dbConfigured) {
    return NextResponse.json({ skipped: true, reason: 'DATABASE_URL non configurée' });
  }

  const sql = requireDb();
  const result = await sql`
    UPDATE credit_lots
    SET credits_remaining = 0
    WHERE credits_remaining > 0 AND expires_at IS NOT NULL AND expires_at <= now()
  `;

  return NextResponse.json({ ok: true, lotsExpired: result.count });
}
