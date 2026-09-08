// Illustrations fixes par signe (public/images/signs/) — fournies par
// l'utilisateur, un personnage par signe dans un style fantasy cohérent
// (voir la conversation du 08/09 : remplace la génération IA à la volée,
// qui ne donnait pas un résultat fiable). Ce sont désormais les visuels
// EXCLUSIFS des publications Instagram par signe (voir
// genererPostInstagramSigne dans lib/social.ts) — jamais régénérés,
// remplaçables à la main en déposant un nouveau fichier ici.

import type { Sign } from './zodiac';

const IMAGES_SIGNES: Record<Sign['key'], string> = {
  belier: '/images/signs/belier.jpg',
  taureau: '/images/signs/taureau.jpg',
  gemeaux: '/images/signs/gemeaux.jpg',
  cancer: '/images/signs/cancer.jpg',
  lion: '/images/signs/lion.jpg',
  vierge: '/images/signs/vierge.jpg',
  balance: '/images/signs/balance.jpg',
  scorpion: '/images/signs/scorpion.jpg',
  sagittaire: '/images/signs/sagittaire.jpg',
  capricorne: '/images/signs/capricorne.jpg',
  verseau: '/images/signs/verseau.jpg',
  poissons: '/images/signs/poissons.jpg',
};

/** Chemin public de l'illustration fixe d'un signe, ou `null` si elle n'a
 * pas encore été fournie (les 12 sont là depuis le 08/09, mais le code
 * reste défensif si un fichier venait à manquer). */
export function imageFixeSigne(signKey: Sign['key']): string | null {
  return IMAGES_SIGNES[signKey] ?? null;
}
