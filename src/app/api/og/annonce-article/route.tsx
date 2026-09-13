// Visuel d'annonce Instagram pour un nouvel article "actualité du ciel"
// (voir lib/news.ts, publié chaque semaine) — demande explicite de
// l'utilisateur (13/09) : l'article doit aussi être annoncé sur Instagram,
// avec un visuel "nouvel article sur le site" et un renvoi vers la page
// actualités. Instagram n'autorise aucun lien cliquable dans une légende
// de post (contrairement aux stories) : l'URL est donc affichée en clair
// sur le visuel ET dans la légende plutôt que promise comme cliquable.
//
// Identité visuelle alignée sur ogBrand.tsx (médaillon du logo + wordmark)
// plutôt que sur les fonds par signe : cette annonce ne concerne aucun
// signe en particulier.

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export const runtime = 'nodejs';

const WIDTH = 1080;
const HEIGHT = 1350;

const COULEURS = {
  aube: '#F8E9DD',
  ambre: '#C08A3E',
  encre: '#3D2B24',
  sourdine: '#8A7361',
};

let logoDataUriCache: string | null = null;
async function logoDataUri(): Promise<string> {
  if (logoDataUriCache) return logoDataUriCache;
  const logo = await readFile(path.join(process.cwd(), 'src', 'app', 'icon.png'));
  logoDataUriCache = `data:image/png;base64,${logo.toString('base64')}`;
  return logoDataUriCache;
}

function tailleTitre(titre: string): number {
  if (titre.length <= 40) return 56;
  if (titre.length <= 70) return 46;
  return 38;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const titre = (searchParams.get('titre') || 'Un nouvel article vient de paraître').slice(0, 200);

  const logo = await logoDataUri();

  const png = await new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: COULEURS.aube,
          padding: '0 90px',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} width={150} height={150} style={{ borderRadius: '50%' }} />

        <div
          style={{
            display: 'flex',
            marginTop: 56,
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 6,
            color: COULEURS.ambre,
            textTransform: 'uppercase',
          }}
        >
          Nouvel article sur le site
        </div>

        <div style={{ display: 'flex', width: 90, height: 1, background: COULEURS.ambre, opacity: 0.7, margin: '28px 0' }} />

        <div
          style={{
            display: 'flex',
            fontSize: tailleTitre(titre),
            fontWeight: 700,
            lineHeight: 1.3,
            color: COULEURS.encre,
            textAlign: 'center',
          }}
        >
          {titre}
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 64,
            padding: '20px 44px',
            background: 'rgba(192,138,62,0.15)',
            borderRadius: 24,
            fontSize: 30,
            fontWeight: 600,
            color: COULEURS.encre,
          }}
        >
          horosphere.fr/actualites
        </div>

        <div style={{ display: 'flex', marginTop: 20, fontSize: 20, color: COULEURS.sourdine, letterSpacing: 1 }}>
          À lire dès maintenant — lien dans la bio
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  ).arrayBuffer();

  const jpeg = await sharp(Buffer.from(png)).jpeg({ quality: 90 }).toBuffer();
  return new NextResponse(new Uint8Array(jpeg), {
    headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=1800' },
  });
}
