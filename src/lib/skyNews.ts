// Génère l'article hebdomadaire "actualité du ciel" — le contenu principal
// de la page /actualites, centré sur ce qui se passe réellement dans le
// ciel (lune, événements astronomiques, position ET mouvement réel des
// planètes — y compris les rétrogradations en cours et les 3 signes les
// plus concernés, voir lib/aspects.ts), pas uniquement sur les annonces
// d'Horosphère. Même logique que lib/social.ts : données réelles
// (astronomy-engine, aucune invention), IA si disponible, sinon repli
// déterministe.

import { moonPhaseInfo } from '../components/MoonPhase';
import { getUpcomingSkyEvents } from './skyEvents';
import { currentPlanetPositions, zodiacSignAt } from './planets';
import { signesLesPlusImpactes, ASPECT_LABEL, type ImpactedSign } from './aspects';
import { callClaude } from './anthropic';
import { visuelActuDuJour } from './social';
import { mulberry32, hashStr, pick } from './fallback-generator';

export type SkyNewsDraft = {
  titre: string;
  resume: string;
  contenu: string;
  imageUrl: string;
  mode: 'ia' | 'demo';
};

function contexteDuCiel(date: Date) {
  const moon = moonPhaseInfo(date);
  const evenements = getUpcomingSkyEvents(date).slice(0, 2);
  const positions = currentPlanetPositions(date);
  const planetes = positions.map((p) => ({
    nom: p.nom,
    signe: zodiacSignAt(p.longitude).nom,
    retrograde: p.retrograde,
  }));
  const retrogrades = planetes.filter((p) => p.retrograde);
  // Le Soleil sert d'ancrage pour "les signes les plus impactés" — c'est la
  // position qui domine une période donnée en astrologie (celle qui change
  // chaque mois, contrairement à la lune qui change chaque jour).
  const soleil = positions.find((p) => p.key === 'soleil')!;
  const impactes = signesLesPlusImpactes(zodiacSignAt(soleil.longitude).key);
  return { moon, evenements, planetes, retrogrades, impactes };
}

function impactesTxt(impactes: ImpactedSign[]): string {
  if (impactes.length === 0) return '';
  const INFLUENCE: Record<ImpactedSign['aspect'], string> = {
    conjonction: "l'énergie du moment s'exprime chez vous sans détour — vous la ressentez en premier",
    opposition: 'une tension à équilibrer plutôt qu\'à trancher dans l\'urgence — un miroir plus qu\'un obstacle',
    carre: 'une friction active, souvent ce qui pousse concrètement à ajuster quelque chose',
  };
  const lignes = impactes.map(({ signe, aspect }) => `${signe.symbole} ${signe.nom} (${ASPECT_LABEL[aspect]}) — ${INFLUENCE[aspect]}.`);
  return `Signes les plus concernés cette semaine :\n${lignes.join('\n')}`;
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

function retrogradesTxt(retrogrades: { nom: string }[]): string {
  if (retrogrades.length === 0) return '';
  const noms = retrogrades.map((r) => r.nom).join(' et ');
  const verbe = retrogrades.length > 1 ? 'sont' : 'est';
  return `Fait notable : ${noms} ${verbe} actuellement rétrograde${retrogrades.length > 1 ? 's' : ''} — un ralentissement apparent, vu depuis la Terre, qui invite plutôt à revoir et ajuster qu'à lancer du neuf sur ce terrain-là.`;
}

function fallbackSkyNews(date: Date): SkyNewsDraft {
  const { moon, evenements, planetes, retrogrades, impactes } = contexteDuCiel(date);
  const dateISO = date.toISOString().slice(0, 10);
  const rng = mulberry32(hashStr('skynews::' + dateISO));
  const titre = pick(rng, TITRES);
  const prochain = evenements[0];
  const prochainLabel = prochain
    ? `${prochain.label.toLowerCase()} le ${new Date(prochain.dateISO).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
    : null;

  const planetesTxt = planetes
    .slice(0, 4)
    .map((p) => `${p.nom} en ${p.signe}${p.retrograde ? ' (rétrograde)' : ''}`)
    .join(', ');

  const contenu = [
    pick(rng, OUVERTURES),
    `La lune est actuellement en phase de ${moon.label.toLowerCase()} (${moon.illumination}% d'illumination). ${moon.influence}`,
    prochainLabel ? `À surveiller : ${prochainLabel}.` : '',
    `Du côté des planètes, on retrouve actuellement ${planetesTxt}.`,
    retrogradesTxt(retrogrades),
    pick(rng, CLOTURES),
    // Toujours en dernier : lib/news.ts (splitArticleSections) extrait ce
    // bloc pour l'afficher dans son propre encadré sur la page article.
    impactesTxt(impactes),
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    titre,
    resume: prochainLabel ? `Lune en ${moon.label.toLowerCase()}, et ${prochainLabel} à l'horizon.` : `Lune en ${moon.label.toLowerCase()} cette semaine.`,
    contenu,
    imageUrl: visuelActuDuJour(dateISO),
    mode: 'demo',
  };
}

// ===== Mode IA =====

export async function generateSkyNews(date: Date = new Date()): Promise<SkyNewsDraft> {
  const dateISO = date.toISOString().slice(0, 10);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallbackSkyNews(date);

  const { moon, evenements, planetes, retrogrades, impactes } = contexteDuCiel(date);
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
  const planetesTxt = planetes.map((p) => `${p.nom} en ${p.signe}${p.retrograde ? ', rétrograde' : ''}`).join(' ; ');
  const evenementsTxt = evenements
    .map((e) => `${e.label} le ${new Date(e.dateISO).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`)
    .join(' ; ');
  const retrogradesTxtIA = retrogrades.length > 0 ? retrogrades.map((r) => r.nom).join(', ') : 'aucune';
  const impactesTxtIA = impactes.map(({ signe, aspect }) => `${signe.nom} (${ASPECT_LABEL[aspect]})`).join(', ');

  const prompt = `Tu écris l'article hebdomadaire "actualité du ciel" pour le site Horosphère, en français. C'est un article éditorial sur ce qui se passe réellement dans le ciel cette semaine — pas une annonce sur l'entreprise Horosphère.

Données réelles du jour (${dateISO}) à utiliser, sans en inventer d'autres :
- Lune : ${moon.label} (${moon.illumination}% d'illumination).
- Prochains événements du ciel : ${evenementsTxt || 'aucun événement majeur imminent'}.
- Position actuelle des planètes (signe) : ${planetesTxt}.
- Planète(s) actuellement rétrograde(s) (mouvement apparent réel, calculé) : ${retrogradesTxtIA}.
- Les 3 signes les plus concernés cette semaine, d'après les aspects du Soleil (conjonction = le signe du Soleil, opposition et carré = les aspects durs classiques) : ${impactesTxtIA}.

Si au moins une planète est rétrograde, fais-en un point fort de l'article (c'est le type d'information la plus recherchée) — explique ce que ça change concrètement, sans dramatiser. Termine l'article par un court paragraphe ou une liste nommant ces 3 signes et l'influence de leur aspect (conjonction = concerné en premier, opposition = tension à équilibrer, carré = friction qui pousse à ajuster) — sans inventer d'autres signes ni d'autres aspects que ceux donnés. Ne prétends jamais calculer un ascendant, une maison ou un transit précis non fourni ci-dessus — reste sur les données données. Ton : chaleureux, curieux, jamais fataliste ni anxiogène, un peu poétique sans être vague. Longueur : 200 à 300 mots pour le contenu.

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :
{
  "titre": "titre court et évocateur de l'article",
  "resume": "1 phrase de résumé, affichée dans la liste des actualités",
  "contenu": "le corps de l'article, plusieurs paragraphes séparés par des sauts de ligne, incluant les signes les plus concernés"
}`;

  try {
    const parsed = await callClaude(apiKey, model, prompt, 900);
    return {
      titre: String(parsed.titre ?? ''),
      resume: String(parsed.resume ?? ''),
      contenu: String(parsed.contenu ?? ''),
      imageUrl: visuelActuDuJour(dateISO),
      mode: 'ia',
    };
  } catch (err) {
    console.error('generateSkyNews failed, fallback démo', err);
    return fallbackSkyNews(date);
  }
}
