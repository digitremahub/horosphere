// Rendu du carrousel "Horoscope du jour — tous les signes" — UNIQUEMENT une
// prévisualisation/repli, jamais la source du visuel réellement publié (voir
// lib/dailyAllSignsPost.ts). Rendu partagé avec api/og/carrousel-metier, voir
// lib/ogGroupesSignesRender.tsx.

import type { NextRequest } from 'next/server';
import { renderCarrouselGroupesSignes } from '@/lib/ogGroupesSignesRender';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return renderCarrouselGroupesSignes(req, 'Horoscope du jour');
}
