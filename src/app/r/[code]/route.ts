// Lien court partagé dans les légendes de posts sociaux automatisés (voir
// lib/social.ts, lib/careerPost.ts, lib/weeklyForecastPost.ts,
// lib/dailyAllSignsPost.ts, api/social/generate-article-announcement) —
// redirige vers la vraie page en ajoutant les paramètres UTM. Sert deux
// besoins à la fois : un texte court et lisible même dans une légende
// Instagram (jamais cliquable là-bas, voir le commentaire dans
// generate-article-announcement — mais reste tapable à la main), et un
// clic traçable partout où le lien EST cliquable (Facebook linkifie
// automatiquement une mention de domaine). Avant ce lien, aucune façon de
// savoir quel post ramenait du monde sur le site (voir l'enquête du 22/09
// dans /api/admin/traffic-report, faite par corrélation faute de mieux).
//
// `source` reste générique ("social") quand la même légende part sur
// plusieurs plateformes à la fois (cas de la plupart des formats "tous
// signes", dupliqués en autant de lignes Airtable) — dans ce cas seul le
// type de contenu (`campagne`) est fiable, pas la plateforme d'origine.
import { NextRequest, NextResponse } from 'next/server';
import { siteUrl } from '@/lib/social';

const LIENS: Record<string, { chemin: string; source: string; campagne: string }> = {
  'ig-signe': { chemin: '/', source: 'instagram', campagne: 'horoscope-signe' },
  'fb-signe': { chemin: '/', source: 'facebook', campagne: 'horoscope-signe' },
  'fb-demo': { chemin: '/', source: 'facebook', campagne: 'horoscope-jour-demo' },
  'ig-jour': { chemin: '/', source: 'instagram', campagne: 'horoscope-jour-tous-signes' },
  metier: { chemin: '/', source: 'social', campagne: 'metier' },
  semaine: { chemin: '/', source: 'social', campagne: 'prevision-semaine' },
  actu: { chemin: '/actualites', source: 'social', campagne: 'actualite' },
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const lien = LIENS[code];
  const cible = new URL(lien ? lien.chemin : '/', siteUrl());
  cible.searchParams.set('utm_source', lien ? lien.source : 'social');
  cible.searchParams.set('utm_medium', 'social');
  cible.searchParams.set('utm_campaign', lien ? lien.campagne : code);
  return NextResponse.redirect(cible, 308);
}
