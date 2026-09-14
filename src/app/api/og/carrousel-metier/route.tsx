// Rendu dynamique du carrousel "Ton métier selon ton signe" — UNIQUEMENT une
// prévisualisation/repli, jamais la source du visuel réellement publié :
// comme les autres formats (voir lib/careerPost.ts), le vrai visuel est un
// export Canva mis à jour manuellement à chaque publication.
//
// Structure (revue le 15/09 pour ne pas dupliquer le carrousel quotidien par
// signe) : couverture + 3 pages de groupe (cardinaux/fixes/mutables), 4
// signes listés par page — un seul post couvre les 12 signes, publié tous
// les 2-3 jours plutôt qu'un signe par jour. Même fond cosmique tournant que
// "Prévisions de la semaine" (pas de photo de signe unique, pour bien
// marquer visuellement que ce format est différent).

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
  encre: '#3D2B24',
  corps: '#3d2b24',
  nacre: '#fffcf8',
};

const FONDS = ['carte-du-ciel.webp', 'sphere-armillaire.webp', 'eclipse.webp'];

let logoDataUriCache: string | null = null;
async function logoDataUri(): Promise<string> {
  if (logoDataUriCache) return logoDataUriCache;
  const logo = await readFile(path.join(process.cwd(), 'src', 'app', 'icon.png'));
  logoDataUriCache = `data:image/png;base64,${logo.toString('base64')}`;
  return logoDataUriCache;
}

const cacheFonds = new Map<string, string>();
async function fondDataUri(nomFichier: string): Promise<string> {
  const enCache = cacheFonds.get(nomFichier);
  if (enCache) return enCache;
  const fichier = await readFile(path.join(process.cwd(), 'public', 'images', 'actualites', nomFichier));
  const jpeg = await sharp(fichier).jpeg({ quality: 90 }).toBuffer();
  const dataUri = `data:image/jpeg;base64,${jpeg.toString('base64')}`;
  cacheFonds.set(nomFichier, dataUri);
  return dataUri;
}

type SigneQS = { symbole: string; nom: string; phrase: string };

function tailleCorps(nbSignes: number): number {
  if (nbSignes <= 1) return 30;
  if (nbSignes <= 2) return 26;
  return 22;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const pageIndex = Math.min(Math.max(pageParam, 1), 4) - 1;
  const estCouverture = pageIndex === 0;
  const periodeLabel = (searchParams.get('periode') || '').slice(0, 60);
  const titre = (searchParams.get('titre') || '').slice(0, 60);
  const debutISO = (searchParams.get('debut') || new Date().toISOString().slice(0, 10)).slice(0, 10);
  let signes: SigneQS[] = [];
  try {
    signes = JSON.parse(searchParams.get('signes') || '[]');
  } catch {
    signes = [];
  }

  const idx = Math.abs(debutISO.split('-').reduce((acc, n) => acc + parseInt(n, 10), 0)) % FONDS.length;
  const [logo, fond] = await Promise.all([logoDataUri(), fondDataUri(FONDS[idx])]);

  const png = await new ImageResponse(
    (
      <div style={{ width: WIDTH, height: HEIGHT, display: 'flex', position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fond} width={WIDTH} height={HEIGHT} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, objectFit: 'cover', opacity: estCouverture ? 1 : 0.35 }} />
        <div style={{ display: 'flex', position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, background: estCouverture ? 'rgba(61,43,36,0.25)' : 'rgba(248,233,221,0.88)' }} />

        {estCouverture ? (
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} width={130} height={130} style={{ borderRadius: '50%' }} />
            <div style={{ display: 'flex', marginTop: 48, fontSize: 26, fontWeight: 700, letterSpacing: 6, color: COULEURS.nacre, textTransform: 'uppercase' }}>
              Ton métier selon ton signe
            </div>
            <div style={{ display: 'flex', marginTop: 24, padding: '18px 48px', background: 'rgba(255,252,248,0.55)', borderRadius: 24, fontSize: 34, fontWeight: 700, color: COULEURS.encre, textAlign: 'center' }}>
              {periodeLabel}
            </div>
          </div>
        ) : (
          <div style={{ position: 'absolute', left: 44, right: 44, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
            <div style={{ display: 'flex', fontSize: 50, fontWeight: 700, letterSpacing: 2, color: COULEURS.encre, marginBottom: 40, textAlign: 'center', textTransform: 'uppercase' }}>
              {titre}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28, width: '100%' }}>
              {signes.map((s, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, color: COULEURS.encre, marginBottom: 6 }}>
                    {s.symbole} {s.nom}
                  </div>
                  <div style={{ display: 'flex', fontSize: tailleCorps(signes.length), lineHeight: 1.4, color: COULEURS.corps }}>
                    {s.phrase}
                  </div>
                </div>
              ))}
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
