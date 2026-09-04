import { NextRequest, NextResponse } from 'next/server';
import { generateDailySocialContent } from '@/lib/social';
import { saveDailyDrafts } from '@/lib/socialStore';
import { hasValidAutomationSecret } from '@/lib/socialAuth';
import { dbConfigured } from '@/lib/db';

// Appelée chaque matin par le scénario Make.com "Génération quotidienne" —
// génère (IA, ou démo si la clé n'est pas configurée) les brouillons du
// jour pour Instagram, Facebook et TikTok, et les enregistre en base au
// statut "brouillon". N'écrase jamais un post déjà validé (voir
// saveDailyDrafts). Ne publie jamais rien elle-même.
export async function POST(req: NextRequest) {
  if (!hasValidAutomationSecret(req)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  if (!dbConfigured) {
    return NextResponse.json({ error: "La base de données n'est pas configurée." }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const dateISO = typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : new Date().toISOString().slice(0, 10);

  try {
    const content = await generateDailySocialContent(new Date(dateISO));
    await saveDailyDrafts(dateISO, content);
    return NextResponse.json({ ok: true, date: dateISO, content });
  } catch (err) {
    console.error('generateDailySocialContent failed', err);
    return NextResponse.json({ error: 'La génération du contenu a échoué.' }, { status: 502 });
  }
}
