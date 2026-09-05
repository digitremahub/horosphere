// Traduction d'affichage des signes du zodiaque — n'affecte jamais la
// logique de zodiac.ts (dates de bascule, décan...), qui reste indépendante
// de la langue : seuls les champs affichés (nom, dates, élément, planète)
// sont traduits, pour l'anglais et l'espagnol. `key` et `symbole` (glyphe
// universel) ne changent jamais.

import type { Sign } from './zodiac';

type SignI18n = Pick<Sign, 'nom' | 'dates' | 'element' | 'planete'>;

const SIGN_EN: Record<string, SignI18n> = {
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

const SIGN_ES: Record<string, SignI18n> = {
  belier: { nom: 'Aries', dates: '21 mar. – 19 abr.', element: 'Fuego', planete: 'Marte' },
  taureau: { nom: 'Tauro', dates: '20 abr. – 20 may.', element: 'Tierra', planete: 'Venus' },
  gemeaux: { nom: 'Géminis', dates: '21 may. – 20 jun.', element: 'Aire', planete: 'Mercurio' },
  cancer: { nom: 'Cáncer', dates: '21 jun. – 22 jul.', element: 'Agua', planete: 'Luna' },
  lion: { nom: 'Leo', dates: '23 jul. – 22 ago.', element: 'Fuego', planete: 'Sol' },
  vierge: { nom: 'Virgo', dates: '23 ago. – 22 sep.', element: 'Tierra', planete: 'Mercurio' },
  balance: { nom: 'Libra', dates: '23 sep. – 22 oct.', element: 'Aire', planete: 'Venus' },
  scorpion: { nom: 'Escorpio', dates: '23 oct. – 21 nov.', element: 'Agua', planete: 'Plutón' },
  sagittaire: { nom: 'Sagitario', dates: '22 nov. – 21 dic.', element: 'Fuego', planete: 'Júpiter' },
  capricorne: { nom: 'Capricornio', dates: '22 dic. – 19 ene.', element: 'Tierra', planete: 'Saturno' },
  verseau: { nom: 'Acuario', dates: '20 ene. – 18 feb.', element: 'Aire', planete: 'Urano' },
  poissons: { nom: 'Piscis', dates: '19 feb. – 20 mar.', element: 'Agua', planete: 'Neptuno' },
};

const TRADUCTIONS: Record<string, Record<string, SignI18n>> = { en: SIGN_EN, es: SIGN_ES };

export function localizedSign<T extends Pick<Sign, 'key'> & Partial<Pick<Sign, 'nom' | 'dates' | 'element' | 'planete'>>>(sign: T, locale: string): T {
  const table = TRADUCTIONS[locale];
  const traduit = table?.[sign.key];
  if (!traduit) return sign;
  return {
    ...sign,
    ...(sign.nom !== undefined && { nom: traduit.nom }),
    ...(sign.dates !== undefined && { dates: traduit.dates }),
    ...(sign.element !== undefined && { element: traduit.element }),
    ...(sign.planete !== undefined && { planete: traduit.planete }),
  };
}
