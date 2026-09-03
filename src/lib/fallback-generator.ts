// Générateur déterministe utilisé quand ANTHROPIC_API_KEY n'est pas encore
// configurée, pour que le produit reste démontrable pendant la mise en
// place du backend IA. Même principe que le tout premier MVP : un hash de
// (date + signe) sélectionne des phrases dans des banques de texte FR.

const HEADLINES = [
  'Le ciel vous ouvre une porte discrète.',
  'Une journée à avancer à votre rythme.',
  'Les astres appellent à la patience.',
  'Un vent nouveau souffle sur vos projets.',
  'Le moment est bon pour trancher.',
];

const AMOUR = [
  'En amour, vous attirez les échanges sincères si vous restez disponible.',
  "Côté cœur, une parole en suspens mérite d'être prononcée aujourd'hui.",
  'Une rencontre ou un message pourrait changer la tonalité de votre journée.',
];

const TRAVAIL = [
  'Au travail, une idée que vous portez depuis un moment mérite d’être formulée à voix haute.',
  'La journée favorise la méthode plus que la précipitation.',
  'Une décision reportée peut enfin être prise.',
];

const ENERGIE = [
  "Sur le plan physique, l'énergie est bonne si vous respectez vos limites.",
  "Une marche ou un moment au grand air fait plus de bien qu'un effort intense.",
  'Votre énergie est stable, idéale pour tenir un rythme régulier.',
];

const CONSEILS = [
  'Osez poser la question qui vous trotte en tête.',
  'Accordez-vous une heure sans écran.',
  'Prenez des nouvelles d’une personne que vous négligez.',
];

const COULEURS = ['Or', 'Bleu nuit', 'Lilas', 'Corail', 'Vert sauge'];
const TALISMANS = ['une clé', 'une bougie', 'une plume', 'une étoile', 'une boussole'];

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function range(rng: () => number, min: number, max: number): number {
  return Math.round(min + rng() * (max - min));
}

export function fallbackHoroscope(signKey: string, dateISO: string) {
  const rng = mulberry32(hashStr(dateISO + '::' + signKey));
  return {
    headline: pick(rng, HEADLINES),
    amour: pick(rng, AMOUR),
    travail: pick(rng, TRAVAIL),
    energie: pick(rng, ENERGIE),
    conseil: pick(rng, CONSEILS),
    scoreAmour: range(rng, 35, 97),
    scoreTravail: range(rng, 35, 97),
    scoreEnergie: range(rng, 35, 97),
    couleur: pick(rng, COULEURS),
    chiffre: range(rng, 1, 49),
    talisman: pick(rng, TALISMANS),
  };
}

const PORTRAITS = [
  "Vous avancez avec une énergie qui ne demande qu'à être canalisée : votre signe vous donne un instinct sûr, à condition de lui laisser le temps de s'exprimer.",
  "Votre nature oscille entre élan et prudence : c'est cette tension qui fait votre force, pas une contradiction à résoudre.",
  "Ce thème dessine une personnalité qui apprend en avançant, plus à l'aise dans le mouvement que dans l'attente.",
];
const FORCES = [
  "Votre force principale est la constance : ce que vous entreprenez, vous le tenez.",
  "Votre capacité d'adaptation est rare : peu de situations vous prennent vraiment au dépourvu.",
];
const DEFIS = [
  "Le principal défi est de ne pas laisser le doute retarder des décisions déjà mûres.",
  "La patience envers le rythme des autres demande un effort conscient de votre part.",
];
const AMOUR_THEME = [
  "En amour, vous donnez beaucoup une fois la confiance installée, mais cette confiance se construit lentement.",
  "Vous recherchez une relation qui laisse de la place à votre indépendance sans jamais devenir de la distance.",
];
const CARRIERE_THEME = [
  "Côté carrière, vous vous épanouissez dans un cadre qui reconnaît vos initiatives sans les étouffer.",
  "Vous progressez par paliers plus que par éclats soudains : la régularité est votre meilleur levier professionnel.",
];
const SPIRITUALITE_THEME = [
  "Sur le plan intérieur, les rituels simples — un carnet, une marche, un silence choisi — vous ancrent plus qu'une quête compliquée.",
  "Vous avancez spirituellement par l'expérience concrète plus que par la théorie.",
];
const CONSEILS_VIE = [
  "Faites confiance au rythme qui est le vôtre, même quand il ne ressemble pas à celui des autres.",
  "Un thème astral n'est pas un destin figé : c'est une carte, pas un itinéraire imposé.",
];
const PIERRES = ['Améthyste', 'Œil de tigre', 'Quartz rose', 'Pierre de lune'];
const SYMBOLES = ['une clé ancienne', 'un compas', 'une lanterne', 'une vague'];

export function fallbackAstralChart(signKey: string, seedKey: string) {
  const rng = mulberry32(hashStr(signKey + '::' + seedKey));
  return {
    portrait: pick(rng, PORTRAITS),
    forces: pick(rng, FORCES),
    defis: pick(rng, DEFIS),
    amour: pick(rng, AMOUR_THEME),
    carriere: pick(rng, CARRIERE_THEME),
    spiritualite: pick(rng, SPIRITUALITE_THEME),
    scoreAmour: range(rng, 40, 95),
    scoreCarriere: range(rng, 40, 95),
    scoreSpiritualite: range(rng, 40, 95),
    conseilDeVie: pick(rng, CONSEILS_VIE),
    pierrePorteBonheur: pick(rng, PIERRES),
    symboleCle: pick(rng, SYMBOLES),
  };
}
