// Génère le contenu de l'"Horoscope global" (voir lib/globalHoroscopePost.ts)
// — appelé par Make chaque jour à 00h. Contrairement aux autres endpoints
// /api/social/generate-*, il n'y a PAS d'étape de préparation manuelle
// ensuite : le même scénario Make publie directement à partir de cette
// réponse, sans passer par le cycle brouillon → "✅ Publier". Le visuel
// renvoyé est une vraie photo du site en rotation (jamais un rendu composé
// en code), donc directement exploitable par Make sans intervention
// humaine.

import { NextRequest, NextResponse } from 'next/server';
import { hasValidAutomationSecret } from '@/lib/automationAuth';
import { genererHoroscopeGlobal } from '@/lib/globalHoroscopePost';

async function handle(dateISO: string) {
  const post = await genererHoroscopeGlobal(new Date(`${dateISO}T00:00:00Z`));
  return NextResponse.json({
    ok: true,
    date: dateISO,
    legende: post.legende,
    hashtags: post.hashtags,
    imageUrl: post.imageUrl,
    mode: post.mode,
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
    console.error('generate-global-horoscope failed', err);
    return NextResponse.json({ error: "La génération de l'horoscope global a échoué." }, { status: 502 });
  }
}
