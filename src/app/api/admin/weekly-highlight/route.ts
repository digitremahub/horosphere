// Consultation du récap astrologique structuré d'une semaine (voir
// lib/weeklyHighlight.ts) — utile pour vérifier le calcul avant d'écrire
// le script hebdomadaire Elian/Lya, ou pour l'injecter plus tard dans un
// prompt de génération automatique du script.
import { NextRequest, NextResponse } from 'next/server';
import { hasValidAutomationSecret } from '@/lib/automationAuth';
import { getWeeklyHighlight } from '@/lib/weeklyHighlight';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bySecretParam = searchParams.get('secret');
  const authorized = hasValidAutomationSecret(req) || (!!bySecretParam && bySecretParam === process.env.SOCIAL_AUTOMATION_SECRET);
  if (!authorized) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });

  const debut = searchParams.get('debut');
  const fin = searchParams.get('fin');
  if (!debut || !fin || !/^\d{4}-\d{2}-\d{2}$/.test(debut) || !/^\d{4}-\d{2}-\d{2}$/.test(fin)) {
    return NextResponse.json({ error: "Paramètres 'debut' et 'fin' requis, au format YYYY-MM-DD." }, { status: 400 });
  }

  try {
    const highlight = getWeeklyHighlight(debut, fin);
    return NextResponse.json(highlight);
  } catch (err) {
    console.error('weekly-highlight failed', err);
    return NextResponse.json({ error: 'Calcul échoué.', detail: String(err) }, { status: 500 });
  }
}
