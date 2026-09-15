// Génère le contenu du post "Ton métier selon ton signe" (voir
// lib/careerPost.ts) — appelé par Make les jours de publication (lundi,
// mercredi, vendredi) avant la préparation manuelle Canva. Comme
// /api/social/generate-weekly-forecast, ne stocke rien côté app : Make écrit
// le brouillon dans Airtable à partir de la réponse. Ne renvoie AUCUN
// visuel : le VRAI visuel est exclusivement un export Canva mis à jour
// manuellement (demande explicite de l'utilisateur, 15/09 — "supprime tous
// les visuels que tu dois créer dans le code, n'utilise que les visuels
// Canva").

import { NextRequest, NextResponse } from 'next/server';
import { hasValidAutomationSecret } from '@/lib/automationAuth';
import { genererMetierTousSignes } from '@/lib/careerPost';

async function handle(dateISO: string) {
  const post = await genererMetierTousSignes(new Date(`${dateISO}T00:00:00Z`));

  return NextResponse.json({
    ok: true,
    date: dateISO,
    periode: post.periode,
    legende: post.legende,
    hashtags: post.hashtags,
    mode: post.mode,
    pages: post.pages,
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
