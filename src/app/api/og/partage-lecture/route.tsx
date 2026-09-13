// Carte de partage visuelle d'une lecture personnelle — pensée pour être
// partagée par l'UTILISATEUR lui-même (story Instagram/WhatsApp), pas pour
// la promotion émise par le compte Horosphère. Décision stratégique
// explicite : le bouche-à-oreille d'une vraie personne qui partage SON
// résultat compte bien plus qu'un compte de marque qui poste dans le vide
// à zéro abonné. Avant cette route, le bouton de partage (ShareButton)
// n'envoyait que du texte brut — aucune image.
//
// Identité visuelle volontairement distincte des illustrations de signe
// (portraits IA) : ici, uniquement le langage graphique déjà établi par
// BrandMark/ZodiacWheelIllustration (traits fins or mat, cercle,
// étincelle à 4 branches) — cohérent avec la vraie identité du site
// (crème, or, terracotta), jamais la palette sombre des anciens visuels
// carrousel.
//
// Rendu via next/og (Satori) + sharp, même principe que /api/og/astrolabe.

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { SIGNS, type Sign } from '@/lib/zodiac';

// Satori (moteur de rendu de next/og) n'a accès à aucune police système —
// contrairement au navigateur, il ne peut pas afficher les glyphes
// astrologiques Unicode (♈-♓, bloc "Divinatory/Miscellaneous Symbols") avec
// la police par défaut de @vercel/og (Geist), qui ne les couvre pas :
// constaté ici sous forme de rectangle "glyphe manquant". Charger une
// police tierce à la demande s'est révélé peu fiable dans cet
// environnement (réponse de Google Fonts interceptée par une page de
// vérification). Solution robuste et sans dépendance réseau : chaque
// glyphe est dessiné en traits vectoriels, même principe que le
// croissant de lune dans MoonPhase.tsx.
type TraitGlyphe =
  | { type: 'path'; d: string }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { type: 'circle'; cx: number; cy: number; r: number };

const GLYPHES_VECTORIELS: Record<Sign['key'], TraitGlyphe[]> = {
  belier: [
    { type: 'line', x1: 50, y1: 82, x2: 50, y2: 58 },
    { type: 'path', d: 'M50 58 C36 58 28 48 30 34 C31 26 38 22 44 27' },
    { type: 'path', d: 'M50 58 C64 58 72 48 70 34 C69 26 62 22 56 27' },
  ],
  taureau: [
    { type: 'circle', cx: 50, cy: 64, r: 16 },
    { type: 'path', d: 'M40 50 C32 38 33 24 42 18' },
    { type: 'path', d: 'M60 50 C68 38 67 24 58 18' },
  ],
  gemeaux: [
    { type: 'line', x1: 26, y1: 26, x2: 74, y2: 26 },
    { type: 'line', x1: 26, y1: 74, x2: 74, y2: 74 },
    { type: 'line', x1: 38, y1: 26, x2: 38, y2: 74 },
    { type: 'line', x1: 62, y1: 26, x2: 62, y2: 74 },
  ],
  cancer: [
    { type: 'circle', cx: 38, cy: 40, r: 11 },
    { type: 'circle', cx: 62, cy: 60, r: 11 },
    { type: 'path', d: 'M47 40 C60 40 60 60 53 60' },
  ],
  lion: [
    { type: 'circle', cx: 42, cy: 45, r: 14 },
    { type: 'path', d: 'M56 45 C72 45 76 60 68 68 C62 74 54 70 56 62' },
  ],
  vierge: [
    { type: 'line', x1: 25, y1: 30, x2: 25, y2: 70 },
    { type: 'path', d: 'M25 40 C25 30 38 30 38 40 L38 70' },
    { type: 'path', d: 'M38 40 C38 30 51 30 51 40 L51 70' },
    { type: 'path', d: 'M51 55 C60 55 68 60 66 68 C64 74 56 74 55 66' },
  ],
  balance: [
    { type: 'line', x1: 30, y1: 35, x2: 70, y2: 35 },
    { type: 'path', d: 'M30 58 C30 46 70 46 70 58' },
    { type: 'line', x1: 25, y1: 72, x2: 75, y2: 72 },
  ],
  scorpion: [
    { type: 'line', x1: 25, y1: 30, x2: 25, y2: 70 },
    { type: 'path', d: 'M25 40 C25 30 38 30 38 40 L38 70' },
    { type: 'path', d: 'M38 40 C38 30 51 30 51 40 L51 70' },
    { type: 'path', d: 'M51 55 L68 55 L68 68' },
    { type: 'line', x1: 68, y1: 68, x2: 60, y2: 62 },
    { type: 'line', x1: 68, y1: 68, x2: 74, y2: 62 },
  ],
  sagittaire: [
    { type: 'line', x1: 25, y1: 75, x2: 75, y2: 25 },
    { type: 'line', x1: 75, y1: 25, x2: 60, y2: 25 },
    { type: 'line', x1: 75, y1: 25, x2: 75, y2: 40 },
    { type: 'line', x1: 40, y1: 60, x2: 55, y2: 50 },
  ],
  capricorne: [
    { type: 'line', x1: 28, y1: 25, x2: 40, y2: 60 },
    { type: 'line', x1: 52, y1: 25, x2: 40, y2: 60 },
    { type: 'path', d: 'M40 60 C55 60 55 78 68 78 C78 78 78 68 70 66' },
  ],
  verseau: [
    { type: 'path', d: 'M25 40 L35 32 L45 48 L55 32 L65 48 L75 40' },
    { type: 'path', d: 'M25 62 L35 54 L45 70 L55 54 L65 70 L75 62' },
  ],
  poissons: [
    { type: 'path', d: 'M30 25 C15 40 15 60 30 75' },
    { type: 'path', d: 'M70 25 C85 40 85 60 70 75' },
    { type: 'line', x1: 30, y1: 50, x2: 70, y2: 50 },
  ],
};

// Même motif que BrandMark.tsx (étincelle à 4 branches) — en vectoriel,
// pour la même raison que GlypheSigne : "✦" (U+2726) n'est pas couvert
// par la police par défaut de Satori.
function Etincelle({ couleur, taille, style }: { couleur: string; taille: number; style?: React.CSSProperties }) {
  const c = taille / 2;
  const spike = taille * 0.42;
  return (
    <svg width={taille} height={taille} viewBox={`0 0 ${taille} ${taille}`} style={style}>
      <line x1={c} y1={c - spike} x2={c} y2={c + spike} stroke={couleur} strokeWidth={taille * 0.09} strokeLinecap="round" />
      <line x1={c - spike} y1={c} x2={c + spike} y2={c} stroke={couleur} strokeWidth={taille * 0.09} strokeLinecap="round" />
    </svg>
  );
}

function GlypheSigne({ signKey, couleur, taille }: { signKey: Sign['key']; couleur: string; taille: number }) {
  const traits = GLYPHES_VECTORIELS[signKey];
  return (
    <svg width={taille} height={taille} viewBox="0 0 100 100">
      {traits.map((t, i) => {
        const commun = { key: i, stroke: couleur, strokeWidth: 6, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
        if (t.type === 'path') return <path {...commun} d={t.d} />;
        if (t.type === 'line') return <line {...commun} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />;
        return <circle {...commun} cx={t.cx} cy={t.cy} r={t.r} />;
      })}
    </svg>
  );
}

export const runtime = 'nodejs';

const WIDTH = 1080;
const HEIGHT = 1350;

// Valeurs littérales de globals.css — Satori ne résout pas les variables CSS.
const COULEURS = {
  aube: '#F8E9DD',
  ambre: '#C08A3E',
  lever: '#E2826A',
  leverProfond: '#A64E36',
  encre: '#3D2B24',
  ombre: '#5B4638',
  sourdine: '#8A7361',
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const signKey = searchParams.get('sign') || '';
  const prenom = (searchParams.get('prenom') || '').trim().slice(0, 40);
  const texte = tronquerProprement(searchParams.get('texte') || '', 220);

  const sign = SIGNS.find((s) => s.key === signKey);
  if (!sign || !texte) {
    return NextResponse.json({ error: 'Paramètres sign et texte requis.' }, { status: 400 });
  }

  const png = await new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: COULEURS.aube,
          position: 'relative',
        }}
      >
        {/* Anneaux décoratifs fins, même esprit que ZodiacWheelIllustration
            (traits or mat concentriques), en filigrane derrière tout le reste. */}
        <div style={{ position: 'absolute', top: 130, left: WIDTH / 2 - 320, width: 640, height: 640, borderRadius: '50%', border: `1px solid ${COULEURS.ambre}`, opacity: 0.25, display: 'flex' }} />
        <div style={{ position: 'absolute', top: 220, left: WIDTH / 2 - 230, width: 460, height: 460, borderRadius: '50%', border: `1px solid ${COULEURS.ambre}`, opacity: 0.18, display: 'flex' }} />

        {/* Médaillon du signe : cercle + étincelle à 4 branches + glyphe —
            même motif que BrandMark, repris ici en plus grand. */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 100 }}>
          <Etincelle couleur={COULEURS.ambre} taille={26} style={{ marginBottom: 4 }} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 220,
              height: 220,
              borderRadius: '50%',
              border: `2px solid ${COULEURS.leverProfond}`,
              background: COULEURS.nacre,
            }}
          >
            <GlypheSigne signKey={sign.key} couleur={COULEURS.leverProfond} taille={130} />
          </div>
          <Etincelle couleur={COULEURS.ambre} taille={26} style={{ marginTop: 4 }} />

          <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, letterSpacing: 4, color: COULEURS.ombre, marginTop: 28, textTransform: 'uppercase' }}>
            {sign.nom}
          </div>
          <div style={{ display: 'flex', fontSize: 20, color: COULEURS.sourdine, marginTop: 6 }}>{sign.dates}</div>
        </div>

        {/* Le cœur de la carte : l'extrait de la lecture elle-même. */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 90px', marginTop: 64 }}>
          {prenom && (
            <div style={{ display: 'flex', fontSize: 24, color: COULEURS.sourdine, marginBottom: 20 }}>
              Pour {prenom}
            </div>
          )}
          <div style={{ display: 'flex', fontSize: 46, fontWeight: 600, fontStyle: 'italic', lineHeight: 1.35, textAlign: 'center', color: COULEURS.encre }}>
            {texte}
          </div>
        </div>

        {/* Pied de carte : trait fin + wordmark, ancré en bas. */}
        <div style={{ position: 'absolute', bottom: 90, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', width: 120, height: 1, background: COULEURS.ambre, opacity: 0.6, marginBottom: 24 }} />
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, letterSpacing: 6, color: COULEURS.encre, textTransform: 'uppercase' }}>
            Horosphère
          </div>
          <div style={{ display: 'flex', fontSize: 18, color: COULEURS.sourdine, marginTop: 8, letterSpacing: 1 }}>
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
