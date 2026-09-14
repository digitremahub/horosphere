// Génère le contenu du post "Ton métier selon ton signe" (1re des nouvelles
// catégories de contenu, voir lib/careerPost.ts) — appelé par Make avant la
// préparation manuelle Canva du 3e post quotidien. Comme
// /api/social/generate-weekly-forecast, ne stocke rien côté app : Make écrit
// le brouillon dans Airtable à partir de la réponse.

import { NextRequest, NextResponse } from 'next/server';
import { hasValidAutomationSecret } from '@/lib/automationAuth';
import { genererMetierSigne } from '@/lib/careerPost';
import { siteUrl } from '@/lib/social';

function urlApercuPage(sign: string, page: 1 | 2 | 3, dateISO: string, titre?: string, texte?: string): string {
  const qs = new URLSearchParams({ sign, page: String(page), date: dateISO });
  if (titre) qs.set('titre', titre);
  if (texte) qs.set('texte', texte);
  return `${siteUrl()}/api/og/carrousel-metier?${qs.toString()}`;
}

async function handle(dateISO: string) {
  const post = await genererMetierSigne(new Date(`${dateISO}T00:00:00Z`));

  const imagesCarrousel = [
    urlApercuPage(post.sign.key, 1, dateISO),
    urlApercuPage(post.sign.key, 2, dateISO, post.pages[0].titre, post.pages[0].corps),
    urlApercuPage(post.sign.key, 3, dateISO, post.pages[1].titre, post.pages[1].corps),
  ];

  return NextResponse.json({
    ok: true,
    date: dateISO,
    signe: post.sign.key,
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
