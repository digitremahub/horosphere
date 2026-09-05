// Traduction d'affichage des signes du zodiaque — n'affecte jamais la
// logique de zodiac.ts (dates de bascule, décan...), qui reste indépendante
// de la langue : seuls les champs affichés (nom, dates, élément, planète)
// sont traduits, pour l'anglais. `key` et `symbole` (glyphe universel) ne
// changent jamais.

import type { Sign } from './zodiac';

const SIGN_EN: Record<string, Pick<Sign, 'nom' | 'dates' | 'element' | 'planete'>> = {
  belier: { nom: 'Aries', dates: 'Mar 21 – Apr 19', element: 'Fire', planete: 'Mars' },
  taureau: { nom: 'Taurus', dates: 'Apr 20 – May 20', element: 'Earth', planete: 'Venus' },
  gemeaux: { nom: 'Gemini', dates: 'May 21 – Jun 20', element: 'Air', planete: 'Mercury' },
  cancer: { nom: 'Cancer', dates: 'Jun 21 – Jul 22', element: 'Water', planete: 'Moon' },
  lion: { nom: 'Leo', dates: 'Jul 23 – Aug 22', element: 'Fire', planete: 'Sun' },
  vierge: { nom: 'Virgo', dates: 'Aug 23 – Sep 22', element: 'Earth', planete: 'Mercury' },
  balance: { nom: 'Libra', dates: 'Sep 23 – Oct 22', element: 'Air', planete: 'Venus' },
  scorpion: { nom: 'Scorpio', dates: 'Oct 23 – Nov 21', element: 'Water', planete: 'Pluto' },
  sagittaire: { nom: 'Sagittarius', dates: 'Nov 22 – Dec 21', element: 'Fire', planete: 'Jupiter' },
  capricorne: { nom: 'Capricorn', dates: 'Dec 22 – Jan 19', element: 'Earth', planete: 'Saturn' },
  verseau: { nom: 'Aquarius', dates: 'Jan 20 – Feb 18', element: 'Air', planete: 'Uranus' },
  poissons: { nom: 'Pisces', dates: 'Feb 19 – Mar 20', element: 'Water', planete: 'Neptune' },
};

export function localizedSign<T extends Pick<Sign, 'key'> & Partial<Pick<Sign, 'nom' | 'dates' | 'element' | 'planete'>>>(sign: T, locale: string): T {
  if (locale !== 'en') return sign;
  const en = SIGN_EN[sign.key];
  if (!en) return sign;
  return {
    ...sign,
    ...(sign.nom !== undefined && { nom: en.nom }),
    ...(sign.dates !== undefined && { dates: en.dates }),
    ...(sign.element !== undefined && { element: en.element }),
    ...(sign.planete !== undefined && { planete: en.planete }),
  };
}
