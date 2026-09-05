// Illustration "alignement des planètes" rendue à la demande, à partir des
// vraies positions écliptiques du jour (astronomy-engine, voir lib/planets.ts)
// — jamais une image générique recyclée. Utilisée comme visuel de
// l'actualité du ciel hebdomadaire (voir visuelActuDuJour dans lib/social.ts)
// quand la rotation tombe sur ce motif : contrairement aux illustrations
// stock voisines (carte du ciel, sphère armillaire, éclipse), celle-ci
// représente un fait astronomique daté, donc jamais figé.
//
// Rendue via next/og (Satori) plutôt qu'en composant React côté client
// (voir AstrolabeIllustration.tsx, sa version vivante et interactive sur le
// site) : il faut ici une image raster avec une URL stable, exploitable par
// l'article et par Make.com. Satori ne résout pas les variables CSS — les
// couleurs reprennent donc les valeurs littérales du thème clair de
// globals.css plutôt que var(--ambre) etc.

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { currentPlanetPositions } from '@/lib/planets';

export const runtime = 'nodejs';

const WIDTH = 1536;
const HEIGHT = 1024;

const COULEURS = {
  aube: '#F8E9DD',
  ambre: '#C08A3E',
  lever: '#E2826A',
  leverProfond: '#A64E36',
  sourdine: '#8A7361',
  prune: '#6C4058',
  sauge: '#5F7F5C',
  ombre: '#5B4638',
};

// Couleur littérale par planète — distincte de PlanetPosition.couleur
// (une variable CSS, résolue par le navigateur pour la version vivante,
// mais illisible par Satori qui ne charge aucune feuille de style).
const COULEUR_PLANETE: Record<string, string> = {
  soleil: COULEURS.ambre,
  lune: COULEURS.sourdine,
  mercure: COULEURS.lever,
  venus: COULEURS.prune,
  mars: COULEURS.leverProfond,
  jupiter: COULEURS.sauge,
  saturne: COULEURS.ombre,
};

const TICKS = Array.from({ length: 12 }, (_, i) => i * 30);

function toXY(angle: number, r: number, cx: number, cy: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get('date');
  const parsed = dateParam ? new Date(dateParam) : new Date();
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const planets = currentPlanetPositions(date);

  const cx = HEIGHT / 2;
  const cy = HEIGHT / 2;
  const ringOuter = 430;
  const ringInner = 340;

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: COULEURS.aube,
        }}
      >
        <svg width={HEIGHT} height={HEIGHT} viewBox={`0 0 ${HEIGHT} ${HEIGHT}`}>
          <circle cx={cx} cy={cy} r={ringOuter} fill="none" stroke={COULEURS.ambre} strokeWidth={3} opacity={0.55} />
          {TICKS.map((angle) => {
            const inner = toXY(angle, ringOuter - 28, cx, cy);
            const outer = toXY(angle, ringOuter, cx, cy);
            return (
              <line
                key={angle}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke={COULEURS.ambre}
                strokeWidth={3}
                opacity={0.55}
              />
            );
          })}
          {planets.map((p) => {
            const { x, y } = toXY(p.longitude, ringOuter - 90, cx, cy);
            return <circle key={p.key} cx={x} cy={y} r={16} fill={COULEUR_PLANETE[p.key] ?? COULEURS.ombre} />;
          })}
          <circle cx={cx} cy={cy} r={ringInner} fill="none" stroke={COULEURS.lever} strokeWidth={3} opacity={0.35} />
          <path
            d={`M ${cx} ${cy - 122} A 122 122 0 0 0 ${cx} ${cy + 122} A 92 122 0 0 1 ${cx} ${cy - 122} Z`}
            fill={COULEURS.ambre}
            opacity={0.85}
          />
        </svg>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );
}
