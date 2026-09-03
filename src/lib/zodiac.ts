export type Sign = {
  key: string;
  nom: string;
  symbole: string;
  debut: [number, number];
  fin: [number, number];
  dates: string;
  element: string;
  planete: string;
};

export const SIGNS: Sign[] = [
  { key: 'belier', nom: 'Bélier', symbole: '♈', debut: [3, 21], fin: [4, 19], dates: '21 mars – 19 avril', element: 'Feu', planete: 'Mars' },
  { key: 'taureau', nom: 'Taureau', symbole: '♉', debut: [4, 20], fin: [5, 20], dates: '20 avril – 20 mai', element: 'Terre', planete: 'Vénus' },
  { key: 'gemeaux', nom: 'Gémeaux', symbole: '♊', debut: [5, 21], fin: [6, 20], dates: '21 mai – 20 juin', element: 'Air', planete: 'Mercure' },
  { key: 'cancer', nom: 'Cancer', symbole: '♋', debut: [6, 21], fin: [7, 22], dates: '21 juin – 22 juillet', element: 'Eau', planete: 'Lune' },
  { key: 'lion', nom: 'Lion', symbole: '♌', debut: [7, 23], fin: [8, 22], dates: '23 juillet – 22 août', element: 'Feu', planete: 'Soleil' },
  { key: 'vierge', nom: 'Vierge', symbole: '♍', debut: [8, 23], fin: [9, 22], dates: '23 août – 22 septembre', element: 'Terre', planete: 'Mercure' },
  { key: 'balance', nom: 'Balance', symbole: '♎', debut: [9, 23], fin: [10, 22], dates: '23 septembre – 22 octobre', element: 'Air', planete: 'Vénus' },
  { key: 'scorpion', nom: 'Scorpion', symbole: '♏', debut: [10, 23], fin: [11, 21], dates: '23 octobre – 21 novembre', element: 'Eau', planete: 'Pluton' },
  { key: 'sagittaire', nom: 'Sagittaire', symbole: '♐', debut: [11, 22], fin: [12, 21], dates: '22 novembre – 21 décembre', element: 'Feu', planete: 'Jupiter' },
  { key: 'capricorne', nom: 'Capricorne', symbole: '♑', debut: [12, 22], fin: [1, 19], dates: '22 décembre – 19 janvier', element: 'Terre', planete: 'Saturne' },
  { key: 'verseau', nom: 'Verseau', symbole: '♒', debut: [1, 20], fin: [2, 18], dates: '20 janvier – 18 février', element: 'Air', planete: 'Uranus' },
  { key: 'poissons', nom: 'Poissons', symbole: '♓', debut: [2, 19], fin: [3, 20], dates: '19 février – 20 mars', element: 'Eau', planete: 'Neptune' },
];

export function findSign(key: string): Sign {
  return SIGNS.find((s) => s.key === key) ?? SIGNS[0];
}

export function signFromBirthdate(month: number, day: number): Sign {
  for (const s of SIGNS) {
    const [bm, bd] = s.debut;
    const [fm, fd] = s.fin;
    if (bm <= fm) {
      if ((month === bm && day >= bd) || (month === fm && day <= fd) || (month > bm && month < fm)) return s;
    } else {
      if ((month === bm && day >= bd) || (month === fm && day <= fd) || month > bm || month < fm) return s;
    }
  }
  return SIGNS[0];
}
