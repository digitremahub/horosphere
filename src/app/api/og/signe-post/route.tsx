// Compose l'illustration fixe d'un signe (voir lib/signImages.ts) avec le
// texte du jour (accroche + action du jour) — utilisée pour les posts
// Instagram quotidiens par signe (lib/social.ts, genererPostInstagramSigne).
// Le texte est ajouté dans un bandeau SOUS l'image plutôt qu'incrusté
// dessus : ces illustrations portent déjà le nom du signe et la marque en
// bas de l'image elle-même, un texte superposé risquerait de les recouvrir.
// Rendue via next/og (Satori), même technique que /api/og/astrolabe —
// l'image source est passée par son URL PUBLIQUE absolue (jamais lue sur
// le disque local : les fichiers de public/ ne sont pas garantis présents
// dans le bundle d'une fonction serverless Vercel, contrairement à leur
// service en tant qu'asset statique — Satori sait charger une image
// distante nativement, donc autant passer par là).

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { imageFixeSigne } from '@/lib/signImages';
import type { Sign } from '@/lib/zodiac';

export const runtime = 'nodejs';

const IMG_WIDTH = 1024;
const IMG_HEIGHT = 1536;
const BANDE_HAUTEUR = 320;

const COULEURS = {
  fond: '#0b0e1a',
  or: '#e8c987',
  creme: '#f3ead9',
};

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://horosphere.fr').replace(/\/$/, '');
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const signe = searchParams.get('signe') as Sign['key'] | null;
  const headline = (searchParams.get('headline') || '').slice(0, 140);
  const conseil = (searchParams.get('conseil') || '').slice(0, 160);

  const chemin = signe ? imageFixeSigne(signe) : null;
  if (!chemin) {
    return new Response("Illustration introuvable pour ce signe.", { status: 404 });
  }

  const imageUrl = `${siteUrl()}${chemin}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: IMG_WIDTH,
          height: IMG_HEIGHT + BANDE_HAUTEUR,
          display: 'flex',
          flexDirection: 'column',
          background: COULEURS.fond,
        }}
      >
        <img src={imageUrl} style={{ width: IMG_WIDTH, height: IMG_HEIGHT, objectFit: 'cover' }} />
        <div
          style={{
            width: IMG_WIDTH,
            height: BANDE_HAUTEUR,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 56px',
            borderTop: `2px solid ${COULEURS.or}`,
          }}
        >
          <div style={{ fontSize: 40, color: COULEURS.or, fontWeight: 700, lineHeight: 1.25, marginBottom: 18 }}>
            {headline}
          </div>
          {conseil && (
            <div style={{ fontSize: 26, color: COULEURS.creme, lineHeight: 1.4 }}>✨ {conseil}</div>
          )}
        </div>
      </div>
    ),
    { width: IMG_WIDTH, height: IMG_HEIGHT + BANDE_HAUTEUR }
  );
}
