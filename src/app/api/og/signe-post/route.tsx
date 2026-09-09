// Compose l'illustration fixe d'un signe (voir lib/signImages.ts) avec le
// texte du jour (accroche + action du jour) — utilisée pour les posts
// Instagram quotidiens par signe (lib/social.ts, genererPostInstagramSigne).
// Le texte est ajouté dans un bandeau SOUS l'image plutôt qu'incrusté
// dessus : ces illustrations portent déjà le nom du signe et la marque en
// bas de l'image elle-même, un texte superposé risquerait de les recouvrir.
// Rendue via next/og (Satori), même technique que /api/og/astrolabe.
//
// Historique de pannes sur cette route (toutes corrigées, gardé en mémoire
// pour ne pas régresser) :
// 1) lire l'image via fs.readFile(public/...) est peu fiable dans une
//    fonction serverless Vercel (fichier pas garanti présent dans le
//    bundle) → passé par l'URL publique de l'image.
// 2) Satori/resvg ne décodait pas le WebP → converti en JPEG.
// 3) même en JPEG, laisser Satori aller chercher l'image lui-même par
//    <img src="https://...">  reste parfois instable en production (500
//    intermittent constaté début septembre, sans image WebP en cause
//    cette fois) — Satori fait sa propre requête réseau au moment du
//    rendu, sujette à lenteur/erreur de ce second aller-retour. On
//    élimine ce risque en récupérant nous-mêmes les octets de l'image
//    (fetch côté serveur, avec le contrôle d'erreur qui va avec) et en
//    les passant en data URI : plus aucune requête réseau pendant le
//    rendu Satori lui-même.
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

  let imageSrc: string;
  try {
    const res = await fetch(`${siteUrl()}${chemin}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    imageSrc = `data:image/jpeg;base64,${buffer.toString('base64')}`;
  } catch (err) {
    console.error(`signe-post: échec de récupération de l'illustration (${chemin})`, err);
    return new Response("Illustration momentanément indisponible.", { status: 502 });
  }

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
        <img src={imageSrc} style={{ width: IMG_WIDTH, height: IMG_HEIGHT, objectFit: 'cover' }} />
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
