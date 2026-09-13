// Carte de partage visuelle d'une lecture personnelle — pensée pour être
// partagée par l'UTILISATEUR lui-même (story Instagram/WhatsApp), pas pour
// la promotion émise par le compte Horosphère. Décision stratégique
// explicite : le bouche-à-oreille d'une vraie personne qui partage SON
// résultat compte bien plus qu'un compte de marque qui poste dans le vide
// à zéro abonné. Avant cette route, le bouton de partage (ShareButton)
// n'envoyait que du texte brut — aucune image.
//
// Fond : l'illustration de saison retenue pour chaque signe (paysage +
// médaillon du glyphe, voir public/images/signes/) — le même visuel que
// celui validé pour la stratégie de contenu du compte, pour une identité
// cohérente entre ce que la marque publie et ce qu'une personne partage.
// Un bandeau dégradé en bas porte le texte (extrait de la lecture, prénom
// optionnel, wordmark) en clair sur fond sombre, plutôt que de redessiner
// un médaillon séparé (l'image le contient déjà).
//
// Rendu via next/og (Satori) + sharp, même principe que /api/og/astrolabe.

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

// Valeurs littérales de globals.css — Satori ne résout pas les variables CSS.
const COULEURS = {
  ambre: '#C08A3E',
  encre: '#3D2B24',
  aube: '#F8E9DD',
  nacre: '#FFFCF8',
};

/** Tronque à `max` caractères sans couper au milieu d'un mot (voir la même
 * logique dans api/og/sign-slide/route.tsx). */
function tronquerProprement(texte: string, max: number): string {
  if (texte.length <= max) return texte;
  const coupe = texte.slice(0, max);
  const dernierePhrase = Math.max(coupe.lastIndexOf('. '), coupe.lastIndexOf('! '), coupe.lastIndexOf('? '));
  if (dernierePhrase > max * 0.8) return coupe.slice(0, dernierePhrase + 1);
  const dernierEspace = coupe.lastIndexOf(' ');
  return (dernierEspace > 0 ? coupe.slice(0, dernierEspace) : coupe).trimEnd() + '…';
}

// Les 12 fonds sont des fichiers statiques (public/images/signes/) — lus
// une fois puis gardés en mémoire (data URI) plutôt que refaits à chaque
// requête : Satori a besoin d'une URL absolue ou d'une data URI pour une
// <img>, une URL relative vers /public ne fonctionne pas côté serveur.
const cacheImagesFond = new Map<Sign['key'], string>();

async function fondDataUri(signKey: Sign['key']): Promise<string> {
  const enCache = cacheImagesFond.get(signKey);
  if (enCache) return enCache;
  const fichier = await readFile(path.join(process.cwd(), 'public', 'images', 'signes', `${signKey}.jpg`));
  const dataUri = `data:image/jpeg;base64,${fichier.toString('base64')}`;
  cacheImagesFond.set(signKey, dataUri);
  return dataUri;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const signKey = searchParams.get('sign') || '';
  const prenom = (searchParams.get('prenom') || '').trim().slice(0, 40);
  const texte = tronquerProprement(searchParams.get('texte') || '', 220);

  const sign = SIGNS.find((s) => s.key === signKey);
  if (!sign || !texte) {
    return NextResponse.json({ error: 'Paramètres sign et texte requis.' }, { status: 400 });
  }

  let fond: string;
  try {
    fond = await fondDataUri(sign.key);
  } catch {
    return NextResponse.json({ error: 'Illustration de signe introuvable.' }, { status: 500 });
  }

  const png = await new ImageResponse(
    (
      <div style={{ width: WIDTH, height: HEIGHT, display: 'flex', position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fond} width={WIDTH} height={HEIGHT} style={{ position: 'absolute', inset: 0, objectFit: 'cover' }} />

        {/* Bandeau dégradé bas : porte tout le texte en clair, plutôt que
            de redessiner un médaillon (déjà présent dans l'illustration). */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 820,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            alignItems: 'center',
            padding: '0 90px 70px',
            background:
              'linear-gradient(to bottom, rgba(61,43,36,0) 0%, rgba(61,43,36,0.55) 32%, rgba(61,43,36,0.94) 62%, rgba(61,43,36,0.97) 100%)',
          }}
        >
          {prenom && (
            <div style={{ display: 'flex', fontSize: 24, color: COULEURS.aube, opacity: 0.85, marginBottom: 18 }}>
              Pour {prenom}
            </div>
          )}
          <div style={{ display: 'flex', fontSize: 44, fontWeight: 600, fontStyle: 'italic', lineHeight: 1.35, textAlign: 'center', color: COULEURS.nacre }}>
            {texte}
          </div>
          <div style={{ display: 'flex', width: 120, height: 1, background: COULEURS.ambre, opacity: 0.7, margin: '26px 0 22px' }} />
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, letterSpacing: 6, color: COULEURS.nacre, textTransform: 'uppercase' }}>
            Horosphère
          </div>
          <div style={{ display: 'flex', fontSize: 17, color: COULEURS.aube, opacity: 0.75, marginTop: 8, letterSpacing: 1 }}>
            horosphere.fr — le développement personnel par les astres
          </div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  ).arrayBuffer();

  const jpeg = await sharp(Buffer.from(png)).jpeg({ quality: 90 }).toBuffer();
  return new NextResponse(new Uint8Array(jpeg), {
    headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=3600' },
  });
}
