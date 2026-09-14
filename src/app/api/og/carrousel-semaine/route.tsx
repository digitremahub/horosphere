// Rendu dynamique du carrousel "Prévisions de la semaine" (couverture +
// Lunaisons + Mouvements planétaires + Signe le plus impacté + Action de la
// semaine) — UNIQUEMENT une prévisualisation/repli, jamais la source du
// visuel réellement publié : comme pour /api/og/carrousel-signe, le vrai
// visuel est un export Canva mis à jour manuellement à chaque publication
// (voir lib/weeklyForecastPost.ts). Sert surtout de référence visuelle
// pendant la conception du design Canva dédié et de filet de sécurité si
// jamais aucun export Canva n'est disponible.

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
  corps: '#3d2b24',
  nacre: '#fffcf8',
};

// Un seul fond cosmique générique (pas de signe particulier ici) — même
// image que la rotation "actualités" (voir visuelActuDuJour), au hasard
// déterministe par semaine plutôt qu'un tirage aléatoire.
const FONDS = ['carte-du-ciel.webp', 'sphere-armillaire.webp', 'eclipse.webp'];

let logoDataUriCache: string | null = null;
async function logoDataUri(): Promise<string> {
  if (logoDataUriCache) return logoDataUriCache;
  const logo = await readFile(path.join(process.cwd(), 'src', 'app', 'icon.png'));
  logoDataUriCache = `data:image/png;base64,${logo.toString('base64')}`;
  return logoDataUriCache;
}

const cacheFonds = new Map<string, string>();
// next/og (Satori + resvg) ne décode pas le WebP — converti en JPEG via
// sharp avant l'encodage en data URI (même constat que pour les autres
// routes /api/og : uniquement JPEG/PNG en entrée).
async function fondDataUri(nomFichier: string): Promise<string> {
  const enCache = cacheFonds.get(nomFichier);
  if (enCache) return enCache;
  const fichier = await readFile(path.join(process.cwd(), 'public', 'images', 'actualites', nomFichier));
  const jpeg = await sharp(fichier).jpeg({ quality: 90 }).toBuffer();
  const dataUri = `data:image/jpeg;base64,${jpeg.toString('base64')}`;
  cacheFonds.set(nomFichier, dataUri);
  return dataUri;
}

function tailleCorps(texte: string): number {
  if (texte.length <= 160) return 36;
  if (texte.length <= 260) return 31;
  if (texte.length <= 360) return 27;
  return 23;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const pageIndex = Math.min(Math.max(pageParam, 1), 5) - 1;
  const periodeLabel = (searchParams.get('periode') || '').slice(0, 60);
  const titre = (searchParams.get('titre') || '').slice(0, 60);
  const texte = (searchParams.get('texte') || '').slice(0, 600);
  const semaineISO = (searchParams.get('semaine') || new Date().toISOString().slice(0, 10)).slice(0, 10);

  const idx = Math.abs(semaineISO.split('-').reduce((acc, n) => acc + parseInt(n, 10), 0)) % FONDS.length;

  const [logo, fond] = await Promise.all([logoDataUri(), fondDataUri(FONDS[idx])]);

  const estCouverture = pageIndex === 0;

  const png = await new ImageResponse(
    (
      <div style={{ width: WIDTH, height: HEIGHT, display: 'flex', position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fond} width={WIDTH} height={HEIGHT} style={{ position: 'absolute', inset: 0, objectFit: 'cover', opacity: estCouverture ? 1 : 0.35 }} />
        <div style={{ display: 'flex', position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, background: estCouverture ? 'rgba(61,43,36,0.25)' : 'rgba(248,233,221,0.88)' }} />

        {estCouverture ? (
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} width={130} height={130} style={{ borderRadius: '50%' }} />
            <div style={{ display: 'flex', marginTop: 48, fontSize: 26, fontWeight: 700, letterSpacing: 6, color: COULEURS.nacre, textTransform: 'uppercase' }}>
              Prévisions de la semaine
            </div>
            <div style={{ display: 'flex', marginTop: 24, padding: '18px 48px', background: 'rgba(255,252,248,0.55)', borderRadius: 24, fontSize: 40, fontWeight: 700, color: COULEURS.encre }}>
              {periodeLabel}
            </div>
          </div>
        ) : (
          <div style={{ position: 'absolute', left: 44, right: 44, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 30px' }}>
            <div style={{ display: 'flex', fontSize: 48, fontWeight: 700, letterSpacing: 2, color: COULEURS.encre, marginBottom: 32, textAlign: 'center' }}>
              {titre}
            </div>
            <div style={{ display: 'flex', fontSize: tailleCorps(texte), lineHeight: 1.45, color: COULEURS.corps, textAlign: 'center' }}>
              {texte}
            </div>
          </div>
        )}

        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 80, display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'flex', padding: '14px 36px', background: 'rgba(255,252,248,0.55)', borderRadius: 20, fontSize: 28, fontWeight: 700, letterSpacing: 6, color: COULEURS.encre, textTransform: 'uppercase' }}>
            Horosphère
          </div>
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
