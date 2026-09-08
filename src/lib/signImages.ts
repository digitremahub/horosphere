// Illustrations fixes par signe (public/images/signs/) — fournies par
// l'utilisateur, un personnage par signe dans un style fantasy cohérent
// (voir la conversation du 08/09 : remplace la génération IA à la volée,
// qui ne donnait pas un résultat fiable). Ce sont désormais les visuels
// EXCLUSIFS des publications Instagram par signe (voir
// genererPostInstagramSigne dans lib/social.ts) — jamais régénérés,
// remplaçables à la main en déposant un nouveau fichier ici.

import type { Sign } from './zodiac';

const IMAGES_SIGNES: Record<Sign['key'], string> = {
  belier: '/images/signs/belier.webp',
  taureau: '/images/signs/taureau.webp',
  gemeaux: '/images/signs/gemeaux.webp',
  cancer: '/images/signs/cancer.webp',
  lion: '/images/signs/lion.webp',
  vierge: '/images/signs/vierge.webp',
  balance: '/images/signs/balance.webp',
  scorpion: '/images/signs/scorpion.webp',
  sagittaire: '/images/signs/sagittaire.webp',
  capricorne: '/images/signs/capricorne.webp',
  verseau: '/images/signs/verseau.webp',
  poissons: '/images/signs/poissons.webp',
};

/** Chemin public de l'illustration fixe d'un signe, ou `null` si elle n'a
 * pas encore été fournie (les 12 sont là depuis le 08/09, mais le code
 * reste défensif si un fichier venait à manquer). */
export function imageFixeSigne(signKey: Sign['key']): string | null {
  return IMAGES_SIGNES[signKey] ?? null;
}
