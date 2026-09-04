// Génère l'article hebdomadaire "actualité du ciel" — le contenu principal
// de la page /actualites, centré sur ce qui se passe réellement dans le
// ciel (lune, événements astronomiques, position des planètes), pas
// uniquement sur les annonces d'Horosphère. Même logique que
// lib/social.ts : données réelles (astronomy-engine, aucune invention),
// IA si disponible, sinon repli déterministe.

import { moonPhaseInfo } from '../components/MoonPhase';
import { getUpcomingSkyEvents } from './skyEvents';
import { currentPlanetPositions, zodiacSignAt } from './planets';
import { callClaude } from './anthropic';
import { mulberry32, hashStr, pick } from './fallback-generator';

export type SkyNewsDraft = {
  titre: string;
  resume: string;
  contenu: string;
  mode: 'ia' | 'demo';
};

function contexteDuCiel(date: Date) {
  const moon = moonPhaseInfo(date);
  const evenements = getUpcomingSkyEvents(date).slice(0, 2);
  const planetes = currentPlanetPositions(date).map((p) => ({
    nom: p.nom,
    signe: zodiacSignAt(p.longitude).nom,
  }));
  return { moon, evenements, planetes };
}

// ===== Mode démo =====

const TITRES = [
  'Ce que le ciel prépare cette semaine',
  "L'actualité du ciel cette semaine",
  'Ce qui bouge au-dessus de nos têtes',
];
const OUVERTURES = [
  "Cette semaine, le ciel ne chôme pas.",
  "Le ciel de cette semaine mérite qu'on lève les yeux.",
  "Voici ce qui se dessine dans le ciel ces prochains jours.",
];
const CLOTURES = [
  "Comme toujours, ces mouvements du ciel ne dictent rien — ils éclairent. À chacun d'y trouver ce qui lui parle.",
  "Rien n'est écrit d'avance : ces repères sont une lecture du ciel, pas une prédiction.",
  "Une invitation à observer, plus qu'à anticiper.",
];

function fallbackSkyNews(date: Date): SkyNewsDraft {
  const { moon, evenements, planetes } = contexteDuCiel(date);
  const rng = mulberry32(hashStr('skynews::' + date.toISOString().slice(0, 10)));
  const titre = pick(rng, TITRES);
  const prochain = evenements[0];
  const prochainLabel = prochain
    ? `${prochain.label.toLowerCase()} le ${new Date(prochain.dateISO).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
    : null;

  const planetesTxt = planetes
    .slice(0, 4)
    .map((p) => `${p.nom} en ${p.signe}`)
    .join(', ');

  const contenu = [
    pick(rng, OUVERTURES),
    `La lune est actuellement en phase de ${moon.label.toLowerCase()} (${moon.illumination}% d'illumination). ${moon.influence}`,
    prochainLabel ? `À surveiller : ${prochainLabel}.` : '',
    `Du côté des planètes, on retrouve actuellement ${planetesTxt}.`,
    pick(rng, CLOTURES),
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    titre,
    resume: prochainLabel ? `Lune en ${moon.label.toLowerCase()}, et ${prochainLabel} à l'horizon.` : `Lune en ${moon.label.toLowerCase()} cette semaine.`,
    contenu,
    mode: 'demo',
  };
}

// ===== Mode IA =====

export async function generateSkyNews(date: Date = new Date()): Promise<SkyNewsDraft> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallbackSkyNews(date);

  const { moon, evenements, planetes } = contexteDuCiel(date);
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
  const planetesTxt = planetes.map((p) => `${p.nom} en ${p.signe}`).join(', ');
  const evenementsTxt = evenements
    .map((e) => `${e.label} le ${new Date(e.dateISO).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`)
    .join(' ; ');

  const prompt = `Tu écris l'article hebdomadaire "actualité du ciel" pour le site Horosphère, en français. C'est un article éditorial sur ce qui se passe réellement dans le ciel cette semaine — pas une annonce sur l'entreprise Horosphère.

Données réelles du jour (${date.toISOString().slice(0, 10)}) à utiliser, sans en inventer d'autres :
- Lune : ${moon.label} (${moon.illumination}% d'illumination).
- Prochains événements du ciel : ${evenementsTxt || 'aucun événement majeur imminent'}.
- Position actuelle des planètes : ${planetesTxt}.

Ne prétends jamais calculer un ascendant, une maison ou un transit précis non fourni ci-dessus — reste sur les données données. Ton : chaleureux, curieux, jamais fataliste ni anxiogène, un peu poétique sans être vague. Longueur : 150 à 250 mots pour le contenu.

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :
{
  "titre": "titre court et évocateur de l'article",
  "resume": "1 phrase de résumé, affichée dans la liste des actualités",
  "contenu": "le corps de l'article, plusieurs paragraphes séparés par des sauts de ligne"
}`;

  try {
    const parsed = await callClaude(apiKey, model, prompt, 900);
    return {
      titre: String(parsed.titre ?? ''),
      resume: String(parsed.resume ?? ''),
      contenu: String(parsed.contenu ?? ''),
      mode: 'ia',
    };
  } catch (err) {
    console.error('generateSkyNews failed, fallback démo', err);
    return fallbackSkyNews(date);
  }
}
