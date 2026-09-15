// Post "Horoscope du jour — tous les signes" — nouveau format quotidien
// demandé par l'utilisateur (15/09) suite à un retour clair : le carrousel
// quotidien par signe (1 ou 2 signes/jour) ne parle qu'à 2 personnes sur 12
// chaque jour, ce qui explique le manque d'engouement ("ça n'intéresse pas
// tout le monde"). Plutôt que d'ajouter des signes au format existant (coût
// de prépa qui grimpe, toujours des signes ignorés ce jour-là), ce nouveau
// post couvre LES 12 SIGNES CHAQUE JOUR — tout le monde trouve le sien en
// swipant. S'AJOUTE au carrousel quotidien par signe (qui reste le contenu
// "profond" — Amour/Travail/Énergie/Action, réservé à ceux dont c'est le
// jour), ne le remplace pas.
//
// Même structure que "Ton métier selon ton signe" (lib/careerPost.ts) —
// couverture + 3 pages de 4 signes, regroupés par qualité astrologique — et
// même principe de coût : UN SEUL appel IA groupé pour les 12 signes,
// jamais douze lectures complètes séparées. Contenu volontairement léger
// (une phrase percutante, pas une lecture détaillée) : la lecture complète
// du jour reste l'exclusivité du carrousel par signe et de l'app.
//
// Comme les autres formats sociaux, le VRAI visuel publié est un export
// Canva mis à jour manuellement à chaque publication — jamais le rendu code
// utilisé tel quel pour la publication réelle (règle absolue du 13/09).

import { SIGNS, type Sign } from './zodiac';
import { moonPhaseInfo } from '../components/MoonPhase';
import { callClaude } from './anthropic';
import { mulberry32, hashStr, pick } from './fallback-generator';
import { pagesParQualite, type PageGroupe } from './zodiacGroups';

const HASHTAGS_JOUR = '#horoscope #astrologie #horosphere #horoscopedujour #signeastrologique';

export type HoroscopeTousSignesPost = {
  dateISO: string;
  label: string;
  legende: string;
  hashtags: string;
  pages: [PageGroupe, PageGroupe, PageGroupe];
  mode: 'ia' | 'demo';
};

// Repli déterministe (sans clé Anthropic) : quelques variantes par signe,
// tirées au sort chaque jour (seed = date) — courtes et actionnables, dans
// le même esprit que le reste du pipeline (jamais de blocage sans clé IA).
const PHRASES_DEMO: Record<Sign['key'], string[]> = {
  belier: [
    "Une occasion de prendre les devants se présente — foncez avant d'y réfléchir trop longtemps.",
    "Votre énergie est haute aujourd'hui : canalisez-la sur UNE priorité plutôt que sur dix fronts.",
  ],
  taureau: [
    "La patience paie aujourd'hui : ce qui semble lent avance en réalité solidement.",
    'Un plaisir simple (un bon repas, un moment calme) vous recentre plus que prévu.',
  ],
  gemeaux: [
    "Une conversation inattendue ouvre une porte — restez disponible aujourd'hui.",
    "Votre curiosité est votre meilleur outil du jour : posez la question que vous retenez.",
  ],
  cancer: [
    "Vos émotions sont un signal fiable aujourd'hui, pas un problème à ignorer.",
    "Un proche a besoin d'un mot de votre part — vous savez lequel.",
  ],
  lion: [
    "Votre travail mérite d'être vu aujourd'hui — ne le minimisez pas.",
    "Une occasion de briller se présente : préparez-vous, elle ne repassera pas.",
  ],
  vierge: [
    "Un détail que vous seul(e) remarquez fait toute la différence aujourd'hui.",
    "Lâchez un peu de contrôle sur ce qui n'a pas besoin d'être parfait.",
  ],
  balance: [
    "Une décision en suspens gagne à être tranchée aujourd'hui, même imparfaitement.",
    "L'harmonie que vous cherchez commence par un choix clair, pas par un compromis flou.",
  ],
  scorpion: [
    "Une vérité que vous pressentez depuis un moment se confirme aujourd'hui.",
    "Votre intensité est une force aujourd'hui si vous la dirigez vers un seul objectif.",
  ],
  sagittaire: [
    "Une envie d'ailleurs se fait sentir — même un petit changement de décor aide.",
    "Une opportunité inattendue mérite votre oui, même sans tout savoir à l'avance.",
  ],
  capricorne: [
    "Un effort discret que vous menez depuis des semaines commence à payer.",
    "Une figure d'autorité remarque votre sérieux aujourd'hui — restez-vous-même.",
  ],
  verseau: [
    "Une idée qui sort du cadre mérite d'être partagée aujourd'hui, pas gardée pour vous.",
    "Le collectif vous booste plus que d'habitude — sollicitez du monde autour de vous.",
  ],
  poissons: [
    "Votre intuition est particulièrement fiable aujourd'hui — accordez-lui du crédit.",
    "Un besoin de vous ressourcer se fait sentir : accordez-vous ce moment sans culpabiliser.",
  ],
};

function phraseDemo(sign: Sign, dateISO: string): string {
  const rng = mulberry32(hashStr(`horoscope-jour-tous-signes::${dateISO}::${sign.key}`));
  return pick(rng, PHRASES_DEMO[sign.key]);
}

/** Un seul appel IA groupé pour les 12 signes — même principe que
 * lib/careerPost.ts. Repli déterministe intégral si l'IA n'est pas
 * configurée ou que l'appel échoue, jamais de blocage de la publication. */
async function phrasesParSigne(dateISO: string): Promise<{ phrases: Record<Sign['key'], string>; mode: 'ia' | 'demo' }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const moon = moonPhaseInfo(new Date(`${dateISO}T00:00:00Z`));
      const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
      const prompt = `Tu es le community manager d'Horosphère. Contexte du jour (${dateISO}) : lune en ${moon.label.toLowerCase()}. Écris, pour CHACUN des 12 signes du zodiaque, UNE phrase courte et percutante (15 à 22 mots) résumant l'horoscope du jour : direct, actionnable, jamais générique ni fataliste, jamais deux signes avec la même structure de phrase. Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact (clés = identifiants, pas les noms affichés) :
{"belier":"...","taureau":"...","gemeaux":"...","cancer":"...","lion":"...","vierge":"...","balance":"...","scorpion":"...","sagittaire":"...","capricorne":"...","verseau":"...","poissons":"..."}`;
      const parsed = await callClaude(apiKey, model, prompt, 1300);
      const phrases: Partial<Record<Sign['key'], string>> = {};
      for (const s of SIGNS) {
        const v = parsed?.[s.key];
        if (typeof v === 'string' && v.trim()) phrases[s.key] = v.trim();
      }
      if (Object.keys(phrases).length === 12) {
        return { phrases: phrases as Record<Sign['key'], string>, mode: 'ia' };
      }
      throw new Error('réponse IA incomplète (signe manquant)');
    } catch (err) {
      console.error('dailyAllSignsPost: appel IA groupé échoué, repli démo', err);
    }
  }
  const phrases = Object.fromEntries(SIGNS.map((s) => [s.key, phraseDemo(s, dateISO)])) as Record<Sign['key'], string>;
  return { phrases, mode: 'demo' };
}

function formatDateLongue(dateISO: string): string {
  return new Date(`${dateISO}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Construit le post quotidien "tous les signes" pour la date donnée —
 * publié CHAQUE JOUR (contrairement à "Ton métier", publié tous les 2-3
 * jours) : c'est justement le format pensé pour que tout le monde trouve
 * son signe tous les jours. */
export async function genererHoroscopeTousSignes(date: Date = new Date()): Promise<HoroscopeTousSignesPost> {
  const dateISO = date.toISOString().slice(0, 10);
  const label = formatDateLongue(dateISO);
  const { phrases, mode } = await phrasesParSigne(dateISO);
  const pages = pagesParQualite(phrases);

  const legende = [
    `🔮 Horoscope du jour — tous les signes — ${label}`,
    '',
    "Cardinaux, fixes ou mutables : swipe pour trouver ton signe.",
    '',
    `Ta lecture complète (Amour, Travail, Énergie, Action du jour) t'attend sur horosphere.fr.`,
  ].join('\n');

  return { dateISO, label, legende, hashtags: HASHTAGS_JOUR, pages, mode };
}
