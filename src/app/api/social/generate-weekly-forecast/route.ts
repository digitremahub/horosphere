// Génère le contenu du carrousel "Prévisions de la semaine" — appelé par
// Make chaque lundi tôt le matin (voir lib/weeklyForecastPost.ts), avant la
// préparation manuelle Canva qui doit avoir lieu avant 9h. Comme
// /api/social/generate, ne stocke rien côté app : Make écrit le brouillon
// dans Airtable à partir de la réponse. Ne renvoie AUCUN visuel : le VRAI
// visuel est exclusivement un export Canva mis à jour manuellement (demande
// explicite de l'utilisateur, 15/09 — "supprime tous les visuels que tu
// dois créer dans le code, n'utilise que les visuels Canva").

import { NextRequest, NextResponse } from 'next/server';
import { hasValidAutomationSecret } from '@/lib/automationAuth';
import { genererPrevisionSemaine } from '@/lib/weeklyForecastPost';

async function handle(dateISO: string) {
  const prevision = await genererPrevisionSemaine(new Date(`${dateISO}T00:00:00Z`));

  return NextResponse.json({
    ok: true,
    date: dateISO,
    periode: prevision.periode,
    legende: prevision.legende,
    hashtags: prevision.hashtags,
    mode: prevision.mode,
    pages: prevision.pages,
  });
}

export async function POST(req: NextRequest) {
  if (!hasValidAutomationSecret(req)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const dateISO = typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : new Date().toISOString().slice(0, 10);
  try {
    return await handle(dateISO);
  } catch (err) {
    console.error('generate-weekly-forecast failed', err);
    return NextResponse.json({ error: 'La génération des prévisions de la semaine a échoué.' }, { status: 502 });
  }
}
