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
// 4) cause RÉELLE du 500 qui persistait malgré (1)-(3), confirmée en
//    reproduisant l'appel directement (web_fetch_vercel_url, ce sandbox
//    n'ayant pas d'accès sortant vers horosphere.fr) : l'emoji ✨ codé en
//    dur dans le JSX. Satori ne sait pas résoudre les glyphes emoji sans
//    police dédiée (contrairement à /api/og/astrolabe, qui n'en affiche
//    aucun) — il lève une exception synchrone pendant la construction de
//    l'arbre, hors de portée du try/catch autour du fetch de l'image, ce
//    qui explique l'absence totale de log d'erreur applicatif (page
//    d'erreur générique Next, x-matched-path "/500"). Retiré, et les
//    paramètres dynamiques (headline/conseil, texte IA) sont
//    défensivement nettoyés de tout emoji au cas où l'IA en placerait un.
// 5) une fois l'image affichée, la publication Instagram elle-même a été
//    rejetée par l'API Graph : "The aspect ratio is not supported"
//    (36003). En ajoutant le bandeau de texte SOUS l'image (1024×1536)
//    sans réduire sa hauteur, le visuel final montait à 1024×1856 —
//    ratio ~0,55, hors de la plage acceptée par Instagram (les visuels
//    fixes seuls, 1024×1536 soit ~0,67, avaient déjà été publiés avec
//    succès). Corrigé en gardant la hauteur TOTALE à 1536 (même ratio que
//    ce qui marche) : l'image est donc affichée en hauteur réduite
//    (1536 - bandeau) avec un recadrage depuis le HAUT (objectPosition
//    'bottom') pour ne jamais rogner le nom du signe ni la marque, déjà
//    positionnés en bas de chaque illustration.
// 6) ratio corrigé, le scénario Make est passé au vert (aucune erreur) et
//    Airtable marqué "Publié" — mais le post n'apparaissait toujours pas
//    sur Instagram. Cause : `ImageResponse` (Satori/resvg) ne sait
//    produire QUE du PNG, sans option pour choisir le format — or l'API
//    Graph exige explicitement du JPEG pour un post photo ("Format: JPEG
//    only"). Le PNG semble accepté sans erreur à la création du post
//    (d'où le faux "succès" côté Make), mais le post ne se publie
//    jamais réellement. Corrigé en reconvertissant le PNG produit par
//    Satori en JPEG via `sharp` avant de répondre — jamais de blocage
//    du pipeline de publication.
import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import sharp from 'sharp';
import { imageFixeSigne } from '@/lib/signImages';
import type { Sign } from '@/lib/zodiac';

export const runtime = 'nodejs';

const IMG_WIDTH = 1024;
// Hauteur TOTALE du visuel (image + bandeau) — volontairement identique à
// la hauteur native des illustrations fixes (1024×1536, ratio ~0,67) déjà
// publiées avec succès sur Instagram, pour rester dans la plage
// d'aspect ratio acceptée par l'API Graph (voir point 5 ci-dessus).
const TOTAL_HAUTEUR = 1536;
const BANDE_HAUTEUR = 320;
const IMG_HEIGHT = TOTAL_HAUTEUR - BANDE_HAUTEUR;

const COULEURS = {
  fond: '#0b0e1a',
  or: '#e8c987',
  creme: '#f3ead9',
};

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://horosphere.fr').replace(/\/$/, '');
}

/** Retire tout emoji d'un texte avant de le confier à Satori, qui n'a pas
 * de police pour ces glyphes et lève une exception non récupérable (voir
 * point 4 en tête de fichier) — jamais de blocage du rendu pour un emoji
 * qu'un texte généré par IA aurait pu contenir. */
function sansEmoji(texte: string): string {
  return texte.replace(/[\p{Extended_Pictographic}‍️]/gu, '').replace(/\s{2,}/g, ' ').trim();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const signe = searchParams.get('signe') as Sign['key'] | null;
  const headline = sansEmoji((searchParams.get('headline') || '').slice(0, 140));
  const conseil = sansEmoji((searchParams.get('conseil') || '').slice(0, 160));

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

  const png = new ImageResponse(
    (
      <div
        style={{
          width: IMG_WIDTH,
          height: TOTAL_HAUTEUR,
          display: 'flex',
          flexDirection: 'column',
          background: COULEURS.fond,
        }}
      >
        <img
          src={imageSrc}
          style={{ width: IMG_WIDTH, height: IMG_HEIGHT, objectFit: 'cover', objectPosition: 'bottom' }}
        />
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
            <div style={{ fontSize: 26, color: COULEURS.creme, lineHeight: 1.4 }}>{conseil}</div>
          )}
        </div>
      </div>
    ),
    { width: IMG_WIDTH, height: TOTAL_HAUTEUR }
  );

  // Satori/resvg (ImageResponse) ne produit que du PNG — reconverti en
  // JPEG ici, seul format accepté par l'API de publication Instagram
  // (voir point 6 en tête de fichier).
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 90 }).toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=0, must-revalidate' },
  });
}
