// Rendu dynamique des 5 diapositives du carrousel Instagram quotidien par
// signe (couverture + Amour + Travail + Énergie + Action du jour) — pensé
// pour reproduire l'identité visuelle validée manuellement dans Canva le
// 13/09/2026 (voir les 12 designs "{Signe} - Horosphère Instagram"),
// mais généré automatiquement chaque jour à partir d'une vraie lecture
// (generateHoroscope), pour alimenter les champs "Visuel (URL)" à
// "Visuel 5 (URL)" de la table Airtable "Réseaux sociaux" sans jamais
// repasser par une édition manuelle dans Canva.
//
// Le médaillon (glyphe + astres + rayons de soleil) n'est PAS redessiné
// ici : il est déjà incrusté dans les photos public/images/signes/*.jpg
// (la même "édition automne" que la carte de partage /api/og/partage-lecture
// et que les fonds Canva). On ne superpose que le texte : triade tournante,
// nom + dates + date du jour (couverture), titre + corps (pages 2 à 5).

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { SIGNS, type Sign } from '@/lib/zodiac';
import { TRIADE_SIGNE } from '@/lib/zodiacTraits';
import { generateHoroscope, type HoroscopeReading } from '@/lib/anthropic';

export const runtime = 'nodejs';

const WIDTH = 1080;
const HEIGHT = 1350;

const COULEURS = {
  encre: '#5c2e0f',
  corps: '#3d2b24',
  nacre: '#fffcf8',
};

type NomPage = 'couverture' | 'amour' | 'travail' | 'energie' | 'action';
const PAGES: NomPage[] = ['couverture', 'amour', 'travail', 'energie', 'action'];
const TITRE_PAGE: Record<Exclude<NomPage, 'couverture'>, string> = {
  amour: 'AMOUR',
  travail: 'TRAVAIL',
  energie: 'ÉNERGIE',
  action: 'ACTION DU JOUR',
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

function corpsDePage(page: NomPage, reading: HoroscopeReading): string {
  if (page === 'amour') return reading.amour;
  if (page === 'travail') return reading.travail;
  if (page === 'energie') return reading.energie;
  return reading.conseil;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const signKey = searchParams.get('sign') || '';
  const pageParam = (searchParams.get('page') || '1') as string;
  const pageIndex = Math.min(Math.max(parseInt(pageParam, 10) || 1, 1), 5) - 1;
  const page = PAGES[pageIndex];
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

  let reading: HoroscopeReading;
  try {
    reading = await generateHoroscope({ feature: 'horoscope_quotidien', sign, dateISO, langue: 'fr' });
  } catch (err) {
    console.error('carrousel-signe: generateHoroscope a échoué', err);
    return NextResponse.json({ error: 'Lecture indisponible.' }, { status: 502 });
  }

  const triade = TRIADE_SIGNE[sign.key];
  const dateLongue = new Date(`${dateISO}T12:00:00Z`).toLocaleDateString('fr-FR', FORMAT_DATE_COUVERTURE);

  const png = await new ImageResponse(
    (
      <div style={{ width: WIDTH, height: HEIGHT, display: 'flex', position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fond} width={WIDTH} height={HEIGHT} style={{ position: 'absolute', inset: 0, objectFit: 'cover' }} />

        {/* Bannière triade — droite, en rotation, semi-transparente sur les
            pages de contenu (comme sur les modèles Canva), pleine opacité
            sur la couverture. */}
        <div
          style={{
            position: 'absolute',
            top: 95,
            left: 330,
            width: 420,
            display: 'flex',
            justifyContent: 'center',
            transform: 'rotate(51deg)',
            transformOrigin: 'center',
            opacity: page === 'couverture' ? 1 : 0.32,
          }}
        >
          <div style={{ display: 'flex', fontSize: 28, fontWeight: 600, letterSpacing: 2, color: COULEURS.encre, textAlign: 'center' }}>
            {triade}
          </div>
        </div>

        {page === 'couverture' ? (
          <div style={{ position: 'absolute', left: 0, right: 0, top: 555, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', fontSize: 62, fontWeight: 700, letterSpacing: 3, color: COULEURS.encre, textTransform: 'uppercase' }}>
              {sign.nom}
            </div>
            <div style={{ display: 'flex', fontSize: 32, color: COULEURS.encre, marginTop: 12 }}>{sign.dates}</div>
            <div
              style={{
                display: 'flex',
                marginTop: 155,
                padding: '18px 48px',
                background: 'rgba(255,252,248,0.51)',
                borderRadius: 24,
                fontSize: 44,
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
              left: 60,
              right: 60,
              top: 572,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', fontSize: 62, fontWeight: 700, letterSpacing: 2, color: COULEURS.encre, marginBottom: 30 }}>
              {TITRE_PAGE[page]}
            </div>
            <div style={{ display: 'flex', fontSize: 32, lineHeight: 1.4, color: COULEURS.corps, textAlign: 'center' }}>
              {corpsDePage(page, reading)}
            </div>
          </div>
        )}

        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 108, display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, letterSpacing: 6, color: COULEURS.encre, textTransform: 'uppercase' }}>
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
