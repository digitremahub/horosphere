// Point d'entrée du compteur de fréquentation maison (voir lib/kpi.ts) —
// appelé par components/VisiteBeacon.tsx sur chaque page publique. Public,
// sans secret : ce n'est qu'un compteur de vues anonyme, pas une route
// sensible. Ne bloque jamais la navigation : répond vite, n'échoue jamais
// bruyamment côté client (le beacon ignore la réponse de toute façon).

import { NextRequest, NextResponse } from 'next/server';
import { dbConfigured } from '@/lib/db';
import { enregistrerVisite } from '@/lib/kpi';

const COOKIE_VISITEUR = 'hz_vid';
const UN_AN_EN_SECONDES = 60 * 60 * 24 * 365;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const path = typeof body.path === 'string' ? body.path.slice(0, 300) : '/';
  const utm = {
    source: typeof body.utmSource === 'string' ? body.utmSource : null,
    medium: typeof body.utmMedium === 'string' ? body.utmMedium : null,
    campaign: typeof body.utmCampaign === 'string' ? body.utmCampaign : null,
  };

  // Identifiant anonyme (aucune donnée personnelle) — persistant 1 an,
  // uniquement pour distinguer "vues" de "visiteurs uniques" dans le KPI.
  let visitorId = req.cookies.get(COOKIE_VISITEUR)?.value;
  const nouveauCookie = !visitorId;
  if (!visitorId) visitorId = crypto.randomUUID();

  const res = NextResponse.json({ ok: true });
  if (nouveauCookie) {
    res.cookies.set(COOKIE_VISITEUR, visitorId, { maxAge: UN_AN_EN_SECONDES, sameSite: 'lax', path: '/' });
  }

  if (dbConfigured) {
    try {
      await enregistrerVisite(path, visitorId, utm);
    } catch (err) {
      console.error('track-visit: enregistrement échoué', err);
    }
  }

  return res;
}
