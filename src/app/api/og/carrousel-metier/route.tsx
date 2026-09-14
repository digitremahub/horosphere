// Rendu dynamique du carrousel "Ton métier selon ton signe" (couverture +
// texte principal + action du jour) — UNIQUEMENT une prévisualisation/repli,
// jamais la source du visuel réellement publié : comme pour
// /api/og/carrousel-signe et /api/og/carrousel-semaine, le vrai visuel est un
// export Canva mis à jour manuellement à chaque publication (voir
// lib/careerPost.ts). Sert de référence visuelle pendant la conception du
// design Canva dédié et de filet de sécurité si aucun export Canva n'est
// disponible.
//
// Même fond que le carrousel quotidien par signe (public/images/signes/) —
// identité visuelle cohérente entre les deux formats, seule la mise en page
// du texte diffère (2 pages de contenu au lieu de 4).

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { SIGNS, type Sign } from '@/lib/zodiac';

export const runtime = 'nodejs';

const WIDTH = 1080;
const HEIGHT = 1350;

const COULEURS = {
  encre: '#5c2e0f',
  corps: '#3d2b24',
  nacre: '#fffcf8',
};

const FORMAT_DATE_COUVERTURE: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };

const cacheImagesFond = new Map<Sign['key'], string>();
async function fondDataUri(signKey: Sign['key']): Promise<string> {
  const enCache = cacheImagesFond.get(signKey);
  if (enCache) return enCache;
  const fichier = await readFile(path.join(process.cwd(), 'public', 'images', 'signes', `${signKey}.jpg`));
  const dataUri = `data:image/jpeg;base64,${fichier.toString('base64')}`;
  cacheImagesFond.set(signKey, dataUri);
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
  const signKey = searchParams.get('sign') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const pageIndex = Math.min(Math.max(pageParam, 1), 3) - 1;
  const estCouverture = pageIndex === 0;
  const titre = (searchParams.get('titre') || '').slice(0, 60);
  const texte = (searchParams.get('texte') || '').slice(0, 600);
  const dateISO = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.get('date') || '')
    ? (searchParams.get('date') as string)
    : new Date().toISOString().slice(0, 10);

  const sign = SIGNS.find((s) => s.key === signKey);
  if (!sign) {
    return NextResponse.json({ error: 'Paramètre sign invalide.' }, { status: 400 });
  }

  let fond: string;
  try {
    fond = await fondDataUri(sign.key);
  } catch {
    return NextResponse.json({ error: 'Illustration de signe introuvable.' }, { status: 500 });
  }

  const dateLongue = new Date(`${dateISO}T12:00:00Z`).toLocaleDateString('fr-FR', FORMAT_DATE_COUVERTURE);

  const png = await new ImageResponse(
    (
      <div style={{ width: WIDTH, height: HEIGHT, display: 'flex', position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fond} width={WIDTH} height={HEIGHT} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, objectFit: 'cover' }} />

        {estCouverture ? (
          <div style={{ position: 'absolute', left: 0, right: 0, top: 500, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', padding: '14px 40px', background: 'rgba(255,252,248,0.66)', borderRadius: 24, fontSize: 26, fontWeight: 700, letterSpacing: 4, color: COULEURS.encre, textTransform: 'uppercase' }}>
              Ton métier selon ton signe
            </div>
            <div style={{ display: 'flex', fontSize: 62, fontWeight: 700, letterSpacing: 3, color: COULEURS.encre, textTransform: 'uppercase', marginTop: 32 }}>
              {sign.nom}
            </div>
            <div
              style={{
                display: 'flex',
                marginTop: 24,
                padding: '18px 48px',
                background: 'rgba(255,252,248,0.51)',
                borderRadius: 24,
                fontSize: 38,
                color: COULEURS.encre,
              }}
            >
              {dateLongue}
            </div>
          </div>
        ) : (
          <div
            style={{
              position: 'absolute',
              left: 44,
              right: 44,
              top: 400,
              bottom: 210,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '36px 30px',
              background: 'rgba(255,252,248,0.66)',
              borderRadius: 32,
            }}
          >
            <div style={{ display: 'flex', fontSize: 52, fontWeight: 700, letterSpacing: 2, color: COULEURS.encre, marginBottom: 28, textAlign: 'center' }}>
              {titre}
            </div>
            <div style={{ display: 'flex', fontSize: tailleCorps(texte), lineHeight: 1.45, color: COULEURS.corps, textAlign: 'center' }}>
              {texte}
            </div>
          </div>
        )}

        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 92, display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              display: 'flex',
              padding: '14px 36px',
              background: 'rgba(255,252,248,0.55)',
              borderRadius: 20,
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 6,
              color: COULEURS.encre,
              textTransform: 'uppercase',
            }}
          >
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
