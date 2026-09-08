// Met à jour les URLs des 3 vidéos du site (teaser homepage, récap hebdo,
// onboarding) — voir lib/siteConfig.ts. GET pour lire, POST/GET(+value)
// pour écrire, même secret que les autres routes d'automatisation. Pensé
// pour être appelé aussi bien à la main (URL collée dans un navigateur,
// pratique pour la mise à jour hebdomadaire du récap) que depuis Make.

import { NextRequest, NextResponse } from 'next/server';
import { hasValidAutomationSecret } from '@/lib/automationAuth';
import { dbConfigured } from '@/lib/db';
import { getSiteConfig, setSiteConfig, CLES_VIDEO } from '@/lib/siteConfig';

function authorized(req: NextRequest): boolean {
  const bySecretParam = new URL(req.url).searchParams.get('secret');
  return hasValidAutomationSecret(req) || (!!bySecretParam && bySecretParam === process.env.SOCIAL_AUTOMATION_SECRET);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "La base de données n'est pas configurée." }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');
  const value = searchParams.get('value');

  // GET avec key+value : écriture depuis un simple lien collé dans un
  // navigateur (pas besoin de POST pour la mise à jour hebdo manuelle).
  if (key && value) {
    await setSiteConfig(key, value);
    return NextResponse.json({ ok: true, key, value });
  }

  if (key) {
    return NextResponse.json({ key, value: await getSiteConfig(key) });
  }

  const toutes = await Promise.all(Object.values(CLES_VIDEO).map(async (k) => [k, await getSiteConfig(k)] as const));
  return NextResponse.json(Object.fromEntries(toutes));
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "La base de données n'est pas configurée." }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const key = String(body.key || '');
  const value = String(body.value || '');
  if (!key || !value) return NextResponse.json({ error: "'key' et 'value' requis." }, { status: 400 });

  await setSiteConfig(key, value);
  return NextResponse.json({ ok: true, key, value });
}
