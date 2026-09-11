// Une "diapositive" du carrousel Instagram par signe — l'image fixe du
// signe (voir lib/signImages.ts) en plein cadre, un bandeau translucide
// couleur crème en bas portant le nom de la catégorie
// (amour/travail/énergie/action, ou l'accroche pour la couverture) en
// GRIS (#545454) — jamais en blanc — et en GROS (mot dominant, façon
// carte-citation), pas en simple libellé discret. Style aligné sur le
// prototype validé dans Canva (voir la base de modèles de marque
// Horosphère) : c'est ce même rendu (image plein cadre + bandeau crème +
// mot de catégorie en grand + texte gris) que ce générateur de secours
// reproduit en attendant que l'automatisation Canva (Make, module
// Autofill) soit branchée pour de bon. Décisions explicites de
// l'utilisateur, dans l'ordre : texte gris jamais blanc, posé sur un
// bandeau clair (pas de voile sombre) ; puis mot de catégorie en grosses
// écritures directement sur l'image, pas en petit texte discret.
//
// Rendu via next/og (Satori), comme /api/og/astrolabe — fournit une URL
// stable et publiquement accessible, exploitable telle quelle par
// Instagram (voir lib/social.ts, construireCarrouselInstagramSigne). Satori
// ne produit que du PNG ; converti en JPEG ici via sharp, l'API Instagram
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

// Hauteur du bandeau crème sur lequel repose le texte, en bas de l'image
// pleine page — le mot de catégorie en grand y prend l'essentiel de la
// place, avec le nom du signe (petit) au-dessus et le texte du jour
// (corps de paragraphe) en dessous.
const HAUTEUR_BANDEAU = 660;

const COULEURS = {
  // Crème translucide (même famille que --aube ailleurs sur le site),
  // pour que le texte gris garde un fort contraste quelle que soit
  // l'image en arrière-plan.
  bandeau: 'rgba(248, 238, 220, 0.95)',
  // --lever-profond dans globals.css : "texte d'emphase, survol, erreurs"
  // — le bon choix pour un mot mis en avant. --ambre ("or mat — traits
  // fins, graduations, séparateurs") avait été utilisé par erreur ici.
  emphase: '#A64E36',
  // Gris neutre — même valeur que le prototype validé dans Canva.
  gris: '#545454',
};

export type CategorieSlide = 'cover' | 'amour' | 'travail' | 'energie' | 'action';

// Mot de catégorie affiché en GRAND (voir COULEURS.ambre) — plus d'emoji
// ici, contrairement à la légende du post (voir lib/social.ts) : sur
// l'image, seul le mot doit dominer visuellement.
const LABEL_CATEGORIE: Record<CategorieSlide, string> = {
  cover: 'Horoscope du jour',
  amour: 'Amour',
  travail: 'Travail',
  energie: 'Énergie',
  action: 'Action du jour',
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
      <div style={{ width: WIDTH, height: HEIGHT, display: 'flex', position: 'relative', background: COULEURS.gris }}>
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            width={WIDTH}
            height={HEIGHT}
            style={{ objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
          />
        )}
        {/* Bandeau crème translucide superposé DIRECTEMENT sur l'image (pas
            en dessous) — texte toujours en gris, jamais en blanc. */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            width: WIDTH,
            height: HAUTEUR_BANDEAU,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '0 56px 64px',
            background: COULEURS.bandeau,
          }}
        >
          {/* Pas de nom de signe ici : il est déjà écrit sur l'illustration
              elle-même (voir lib/signImages.ts) — le répéter ferait doublon,
              retour explicite de l'utilisateur. */}
          {/* Mot de catégorie en GRAND — l'élément dominant de la
              diapositive, écrit directement sur l'image (demande
              explicite de l'utilisateur, pas un petit libellé discret). */}
          <div style={{ display: 'flex', fontSize: 84, fontWeight: 700, lineHeight: 1.1, color: COULEURS.emphase, marginBottom: 24 }}>
            {LABEL_CATEGORIE[categorie]}
          </div>
          {/* Gris plus soutenu + gras : le retour utilisateur signalait un
              texte peu lisible malgré le bandeau clair. */}
          <div style={{ display: 'flex', fontSize: 36, fontWeight: 700, lineHeight: 1.35, color: '#3D3D3D' }}>{texte}</div>
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
