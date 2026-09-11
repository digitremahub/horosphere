// Une "diapositive" du carrousel Instagram par signe — l'image fixe du
// signe (voir lib/signImages.ts) en haut, un bandeau de couleur avec le
// texte d'UNE catégorie (amour/travail/énergie/action, ou l'accroche pour
// la couverture) en bas. Décision explicite de l'utilisateur : montrer les
// catégories directement sur les images du carrousel plutôt qu'uniquement
// dans la légende — contrairement au post Instagram simple (signe seul,
// jamais recadré ni recomposé, voir genererPostInstagramSigne), le
// carrousel est un format différent qui suppose ce cadrage.
//
// Rendu via next/og (Satori), comme /api/og/astrolabe — fournit une URL
// stable et publiquement accessible, exploitable telle quelle par
// Instagram (voir lib/social.ts, genererCarrouselInstagramSigne). Satori ne
// produit que du PNG ; converti en JPEG ici via sharp, l'API Instagram
// l'exigeant strictement pour les publications carrousel.

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { SIGNS } from '@/lib/zodiac';
import { imageFixeSigne } from '@/lib/signImages';

export const runtime = 'nodejs';

const WIDTH = 1080;
const HEIGHT = 1350; // Ratio 4:5 — portrait maximal accepté par Instagram.
const HAUTEUR_IMAGE = 1050;
const HAUTEUR_BANDEAU = HEIGHT - HAUTEUR_IMAGE;

const COULEURS = {
  aube: '#F8E9DD',
  ambre: '#C08A3E',
  lever: '#E2826A',
  leverProfond: '#A64E36',
  sourdine: '#8A7361',
  ombre: '#5B4638',
};

export type CategorieSlide = 'cover' | 'amour' | 'travail' | 'energie' | 'action';

const LABEL_CATEGORIE: Record<CategorieSlide, string> = {
  cover: 'Horoscope du jour',
  amour: '💛 Amour',
  travail: '💼 Travail',
  energie: '⚡ Énergie',
  action: '✨ Action du jour',
};

const CATEGORIES_VALIDES = new Set<CategorieSlide>(['cover', 'amour', 'travail', 'energie', 'action']);

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://horosphere-live.vercel.app').replace(/\/$/, '');
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const signKey = searchParams.get('sign') || '';
  const categorieParam = searchParams.get('categorie') || '';
  const texte = (searchParams.get('texte') || '').slice(0, 260);

  const sign = SIGNS.find((s) => s.key === signKey);
  const categorie = CATEGORIES_VALIDES.has(categorieParam as CategorieSlide) ? (categorieParam as CategorieSlide) : null;
  if (!sign || !categorie || !texte) {
    return NextResponse.json({ error: 'Paramètres sign, categorie et texte requis.' }, { status: 400 });
  }

  const cheminImage = imageFixeSigne(sign.key);
  const imageUrl = cheminImage ? `${siteUrl()}${cheminImage}` : null;

  const png = await new ImageResponse(
    (
      <div style={{ width: WIDTH, height: HEIGHT, display: 'flex', flexDirection: 'column', background: COULEURS.aube }}>
        <div style={{ width: WIDTH, height: HAUTEUR_IMAGE, display: 'flex', position: 'relative', overflow: 'hidden' }}>
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} width={WIDTH} height={HAUTEUR_IMAGE} style={{ objectFit: 'cover' }} />
          )}
        </div>
        <div
          style={{
            width: WIDTH,
            height: HAUTEUR_BANDEAU,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 56px',
            background: COULEURS.aube,
            borderTop: `4px solid ${COULEURS.ambre}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <span style={{ fontSize: 44 }}>{sign.symbole}</span>
            <span style={{ fontSize: 30, fontWeight: 700, color: COULEURS.leverProfond }}>{sign.nom}</span>
          </div>
          <div style={{ display: 'flex', fontSize: 24, textTransform: 'uppercase', letterSpacing: 2, color: COULEURS.ambre, marginBottom: 10 }}>
            {LABEL_CATEGORIE[categorie]}
          </div>
          <div style={{ display: 'flex', fontSize: 32, lineHeight: 1.35, color: COULEURS.ombre }}>{texte}</div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  ).arrayBuffer();

  const jpeg = await sharp(Buffer.from(png)).jpeg({ quality: 88 }).toBuffer();
  return new NextResponse(new Uint8Array(jpeg), {
    headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=3600' },
  });
}
