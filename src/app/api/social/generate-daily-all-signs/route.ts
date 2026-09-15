// Génère le contenu du post "Horoscope du jour — tous les signes" (voir
// lib/dailyAllSignsPost.ts) — appelé par Make CHAQUE JOUR avant la
// préparation manuelle Canva. Comme les autres endpoints /api/social/generate-*,
// ne stocke rien côté app : Make écrit le brouillon dans Airtable à partir
// de la réponse.

import { NextRequest, NextResponse } from 'next/server';
import { hasValidAutomationSecret } from '@/lib/automationAuth';
import { genererHoroscopeTousSignes } from '@/lib/dailyAllSignsPost';
import { siteUrl } from '@/lib/social';
import type { PageGroupe } from '@/lib/zodiacGroups';

function urlCouverture(label: string, dateISO: string): string {
  const qs = new URLSearchParams({ page: '1', periode: label, debut: dateISO });
  return `${siteUrl()}/api/og/carrousel-jour?${qs.toString()}`;
}

function urlPageGroupe(page: 2 | 3 | 4, dateISO: string, groupe: PageGroupe): string {
  const qs = new URLSearchParams({
    page: String(page),
    debut: dateISO,
    titre: groupe.titre,
    signes: JSON.stringify(groupe.signes.map((s) => ({ symbole: s.sign.symbole, nom: s.sign.nom, phrase: s.phrase }))),
  });
  return `${siteUrl()}/api/og/carrousel-jour?${qs.toString()}`;
}

async function handle(dateISO: string) {
  const post = await genererHoroscopeTousSignes(new Date(`${dateISO}T00:00:00Z`));

  const imagesCarrousel = [
    urlCouverture(post.label, post.dateISO),
    urlPageGroupe(2, post.dateISO, post.pages[0]),
    urlPageGroupe(3, post.dateISO, post.pages[1]),
    urlPageGroupe(4, post.dateISO, post.pages[2]),
  ];

  return NextResponse.json({
    ok: true,
    date: dateISO,
    label: post.label,
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
    console.error('generate-daily-all-signs failed', err);
    return NextResponse.json({ error: 'La génération du post "Horoscope du jour" a échoué.' }, { status: 502 });
  }
}
