import { NextRequest, NextResponse } from 'next/server';
import { generateDailySocialContent } from '@/lib/social';
import { hasValidAutomationSecret } from '@/lib/automationAuth';

// Appelée chaque matin par le scénario Make.com "Génération quotidienne" —
// génère (IA, ou démo si la clé n'est pas configurée) le contenu du jour
// pour Instagram, Facebook et TikTok. Ne stocke rien côté app : Make crée
// directement les brouillons dans la base Airtable, où le community
// manager les relit, les ajuste et les publie (voir README, section
// "Promotion réseaux sociaux").
export async function POST(req: NextRequest) {
  if (!hasValidAutomationSecret(req)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const dateISO = typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : new Date().toISOString().slice(0, 10);

  try {
    const content = await generateDailySocialContent(new Date(dateISO));
    return NextResponse.json({ ok: true, date: dateISO, content });
  } catch (err) {
    console.error('generateDailySocialContent failed', err);
    return NextResponse.json({ error: 'La génération du contenu a échoué.' }, { status: 502 });
  }
}
