// Génère le contenu du post "Ton métier selon ton signe" (voir
// lib/careerPost.ts) — appelé par Make les jours de publication (lundi,
// mercredi, vendredi) avant la préparation manuelle Canva. Comme
// /api/social/generate-weekly-forecast, ne stocke rien côté app : Make écrit
// le brouillon dans Airtable à partir de la réponse.

import { NextRequest, NextResponse } from 'next/server';
import { hasValidAutomationSecret } from '@/lib/automationAuth';
import { genererMetierTousSignes, type PageGroupe } from '@/lib/careerPost';
import { siteUrl } from '@/lib/social';

function urlCouverture(periodeLabel: string, debutISO: string): string {
  const qs = new URLSearchParams({ page: '1', periode: periodeLabel, debut: debutISO });
  return `${siteUrl()}/api/og/carrousel-metier?${qs.toString()}`;
}

function urlPageGroupe(page: 2 | 3 | 4, debutISO: string, groupe: PageGroupe): string {
  const qs = new URLSearchParams({
    page: String(page),
    debut: debutISO,
    titre: groupe.titre,
    signes: JSON.stringify(groupe.signes.map((s) => ({ symbole: s.sign.symbole, nom: s.sign.nom, phrase: s.phrase }))),
  });
  return `${siteUrl()}/api/og/carrousel-metier?${qs.toString()}`;
}

async function handle(dateISO: string) {
  const post = await genererMetierTousSignes(new Date(`${dateISO}T00:00:00Z`));

  const imagesCarrousel = [
    urlCouverture(post.periode.label, post.periode.debut),
    urlPageGroupe(2, post.periode.debut, post.pages[0]),
    urlPageGroupe(3, post.periode.debut, post.pages[1]),
    urlPageGroupe(4, post.periode.debut, post.pages[2]),
  ];

  return NextResponse.json({
    ok: true,
    date: dateISO,
    periode: post.periode,
    legende: post.legende,
    hashtags: post.hashtags,
    mode: post.mode,
    pages: post.pages,
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
    console.error('generate-career-post failed', err);
    return NextResponse.json({ error: 'La génération du post "Ton métier selon ton signe" a échoué.' }, { status: 502 });
  }
}
