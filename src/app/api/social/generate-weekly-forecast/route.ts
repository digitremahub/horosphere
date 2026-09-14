// Génère le contenu du carrousel "Prévisions de la semaine" — appelé par
// Make chaque lundi tôt le matin (voir lib/weeklyForecastPost.ts), avant la
// préparation manuelle Canva qui doit avoir lieu avant 9h. Comme
// /api/social/generate, ne stocke rien côté app : Make écrit le brouillon
// dans Airtable à partir de la réponse.

import { NextRequest, NextResponse } from 'next/server';
import { hasValidAutomationSecret } from '@/lib/automationAuth';
import { genererPrevisionSemaine } from '@/lib/weeklyForecastPost';
import { siteUrl } from '@/lib/social';

function urlApercuPage(page: 1 | 2 | 3 | 4 | 5, periodeLabel: string, semaineISO: string, titre?: string, texte?: string): string {
  const qs = new URLSearchParams({ page: String(page), periode: periodeLabel, semaine: semaineISO });
  if (titre) qs.set('titre', titre);
  if (texte) qs.set('texte', texte);
  return `${siteUrl()}/api/og/carrousel-semaine?${qs.toString()}`;
}

async function handle(dateISO: string) {
  const prevision = await genererPrevisionSemaine(new Date(`${dateISO}T00:00:00Z`));

  const imagesCarrousel = [
    urlApercuPage(1, prevision.periode.label, prevision.periode.debut),
    urlApercuPage(2, prevision.periode.label, prevision.periode.debut, prevision.pages[0].titre, prevision.pages[0].corps),
    urlApercuPage(3, prevision.periode.label, prevision.periode.debut, prevision.pages[1].titre, prevision.pages[1].corps),
    urlApercuPage(4, prevision.periode.label, prevision.periode.debut, prevision.pages[2].titre, prevision.pages[2].corps),
    urlApercuPage(5, prevision.periode.label, prevision.periode.debut, prevision.pages[3].titre, prevision.pages[3].corps),
  ];

  return NextResponse.json({
    ok: true,
    date: dateISO,
    periode: prevision.periode,
    legende: prevision.legende,
    hashtags: prevision.hashtags,
    mode: prevision.mode,
    pages: prevision.pages,
    imagesCarrousel,
    imageUrl: imagesCarrousel[0],
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
