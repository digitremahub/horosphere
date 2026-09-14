// Post "Ton métier selon ton signe" — 1re des nouvelles catégories de
// contenu demandées par l'utilisateur (14/09 : "Je veux d'autres catégories
// aussi : 'ton métier selon ton signe', 'Tes relations selon les autres
// signes', ... pour avoir vraiment du contenu constant"). Décision explicite
// suite aux questions de clarification : ces catégories s'AJOUTENT aux
// carrousels quotidiens existants (3e post/jour, pas un remplacement), et on
// démarre par UNE SEULE catégorie pour valider le format avant de construire
// les 4 designs Canva restants — celle-ci est la première de la liste.
//
// Réutilise telle quelle la lecture thématique "horoscope_carriere" déjà
// existante (lib/anthropic.ts generateThematic + lib/themes.ts) — jamais un
// nouveau prompt IA dupliqué : ce thème couvre exactement "le chemin
// professionnel", avec son propre repli déterministe sans clé Anthropic.
//
// Comme le carrousel quotidien par signe et "Prévisions de la semaine", le
// VRAI visuel publié est un export Canva mis à jour manuellement à chaque
// publication (voir api/og/carrousel-metier/route.tsx pour le rendu de
// secours/prévisualisation uniquement) — jamais le rendu code utilisé tel
// quel pour la publication réelle (règle absolue posée par l'utilisateur le
// 13/09).
//
// Rotation de signe : DISTINCTE de celles d'Instagram matin (offset +0,
// signeDuJourInstagram) et Facebook/Instagram après-midi (offset +6,
// signeDuJourFacebook) — un décalage d'un quart de rotation (+3 sur 12)
// garantit que ce 3e post ne porte jamais le même signe que les deux autres
// le même jour, tout en restant ancré sur le même vrai signe solaire du
// lundi de la semaine (voir indexAncrageSemaine dans lib/social.ts).

import { SIGNS, type Sign } from './zodiac';
import { generateThematic, type ThematicReading } from './anthropic';
import { indexAncrageSemaine, offsetJourUTC } from './social';

const HASHTAGS_METIER = '#horoscope #astrologie #horosphere #carriere #developpementpersonnel';

const DECALAGE_METIER = 3; // un quart de rotation (12/4) — voir note en tête de fichier

export function signeDuJourMetier(date: Date = new Date()): Sign {
  return SIGNS[(indexAncrageSemaine(date) + offsetJourUTC(date) + DECALAGE_METIER) % SIGNS.length];
}

export type PageTexte = { titre: string; corps: string };

export type MetierSignePost = {
  sign: Sign;
  legende: string;
  hashtags: string;
  // Couverture implicite (signe + date, pas de texte de lecture) + 2 pages
  // de contenu : le texte principal (chemin professionnel) et l'action du
  // jour — plus sobre que le carrousel quotidien (qui couvre 3 axes), cohérent
  // avec le fait que ce post se concentre sur un seul axe.
  pages: [PageTexte, PageTexte];
  mode: 'ia' | 'demo';
};

/** Construit le post "Ton métier selon ton signe" du jour, pour le signe de
 * la rotation dédiée (signeDuJourMetier). Toujours un repli déterministe
 * (aucune clé Anthropic requise) — même principe que le reste du pipeline
 * social, via generateThematic (lib/anthropic.ts). */
export async function genererMetierSigne(date: Date = new Date(), sign: Sign = signeDuJourMetier(date)): Promise<MetierSignePost> {
  const dateISO = date.toISOString().slice(0, 10);
  const reading: ThematicReading = await generateThematic({
    theme: 'horoscope_carriere',
    sign,
    seedKey: dateISO,
  });

  const legende = [
    `${sign.symbole} ${sign.nom} — ${reading.titre}`,
    '',
    reading.texte,
    '',
    `⚠️ ${reading.pointAttention}`,
    '',
    `✨ Action du jour : ${reading.conseil}`,
    '',
    `Ton métier selon ton signe, chaque jour sur Horosphère — découvre ta lecture complète sur horosphere.fr.`,
  ].join('\n');

  return {
    sign,
    legende,
    hashtags: `${HASHTAGS_METIER} #${sign.key} #horoscope${sign.nom.replace(/\s/g, '')}`,
    pages: [
      { titre: reading.titre, corps: reading.texte },
      { titre: 'ACTION DU JOUR', corps: reading.conseil },
    ],
    mode: reading.mode,
  };
}
