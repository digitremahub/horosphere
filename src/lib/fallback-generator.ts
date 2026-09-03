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

// ===== Analyse sentimentale (hebdomadaire) =====

const SENT_TITRES = ['Une semaine de recentrage', 'Le cœur en mouvement', 'Une semaine plus claire que prévu', 'Un cycle qui se referme'];
const SENT_DOMINANTE = [
  "Cette semaine, une envie de vérité prend le dessus sur les non-dits accumulés.",
  "Un besoin de tendresse simple domine, plus que les grandes déclarations.",
  "La semaine est marquée par une envie de reprendre la main sur vos choix affectifs.",
];
const SENT_EN_JEU = [
  "Ce qui se joue : la capacité à rester vous-même face à l'attente de l'autre.",
  "Ce qui se transforme : la façon dont vous exprimez ce qui compte pour vous.",
  "Un ajustement discret s'opère entre ce que vous ressentez et ce que vous montrez.",
];
const SENT_RELATIONS = [
  "Dans vos relations, une conversation reportée trouve enfin sa place.",
  "Les liens proches se resserrent si vous acceptez de baisser la garde un instant.",
  "Une personne de votre entourage a besoin d'un signe de votre part, même petit.",
];
const SENT_CONSEIL = [
  "Nommez ce que vous ressentez avant de décider comment agir.",
  "Accordez-vous le droit de changer d'avis sur une histoire ancienne.",
  "Privilégiez une conversation en face à face plutôt qu'un message.",
];
const SENT_MOTS_CLES = ['Sincérité', 'Ancrage', 'Clarté', 'Tendresse', 'Recentrage'];

export function fallbackSentiment(signKey: string, weekKey: string) {
  const rng = mulberry32(hashStr('sentiment::' + signKey + '::' + weekKey));
  return {
    titre: pick(rng, SENT_TITRES),
    dominante: pick(rng, SENT_DOMINANTE),
    enJeu: pick(rng, SENT_EN_JEU),
    relations: pick(rng, SENT_RELATIONS),
    conseil: pick(rng, SENT_CONSEIL),
    scoreClarte: range(rng, 40, 95),
    scoreIntensite: range(rng, 30, 90),
    motCle: pick(rng, SENT_MOTS_CLES),
  };
}

// ===== Compatibilité amoureuse =====

const COMPAT_RESUME = [
  "Un duo qui fonctionne par contraste : ce que l'un n'a pas, l'autre l'apporte naturellement.",
  "Une entente qui se construit dans la durée, pas dans l'évidence immédiate.",
  "Deux tempéraments qui se reconnaissent vite, à condition de respecter le rythme de l'autre.",
];
const COMPAT_FORTS = [
  "Points forts : une complicité facile et une capacité commune à se rassurer mutuellement.",
  "Points forts : un respect naturel de l'indépendance de l'autre, sans distance froide.",
  "Points forts : une communication qui s'installe sans effort une fois la confiance posée.",
];
const COMPAT_FRICTION = [
  "Point de friction : le rythme d'engagement n'est pas toujours le même des deux côtés.",
  "Point de friction : la gestion des désaccords demande à être apprivoisée avec le temps.",
  "Point de friction : l'un a besoin de parler, l'autre de silence — un terrain d'entente existe.",
];
const COMPAT_AMOUR = [
  "Sur le plan amoureux, l'alchimie est réelle mais se révèle davantage dans la durée que dans l'instant.",
  "L'attirance est immédiate ; c'est la constance qui demandera un effort partagé.",
];
const COMPAT_COMMUNICATION = [
  "La communication passe mieux dans l'action partagée que dans les grandes discussions.",
  "Un mot dit au bon moment compte plus, pour ce duo, qu'un long discours.",
];
const COMPAT_CONSEIL = [
  "Laissez à cette relation le temps de trouver son propre rythme, sans le comparer à d'autres.",
  "Nommez vos besoins clairement plutôt que d'attendre qu'ils soient devinés.",
];

export function fallbackCompatibility(signKey: string, autreSignKey: string, seedKey: string) {
  const pairKey = [signKey, autreSignKey].sort().join('+');
  const rng = mulberry32(hashStr('compat::' + pairKey + '::' + seedKey));
  return {
    scoreGlobal: range(rng, 45, 96),
    resume: pick(rng, COMPAT_RESUME),
    pointsForts: pick(rng, COMPAT_FORTS),
    pointsFriction: pick(rng, COMPAT_FRICTION),
    amour: pick(rng, COMPAT_AMOUR),
    communication: pick(rng, COMPAT_COMMUNICATION),
    conseil: pick(rng, COMPAT_CONSEIL),
  };
}

// ===== Grande analyse personnalisée =====

const GA_SYNTHESE = [
  "Ce bilan dessine une période de consolidation : moins une remise en question totale qu'un ajustement fin de ce qui fonctionne déjà.",
  "Cette période invite à faire le tri entre ce qui vous porte réellement et ce que vous maintenez par habitude.",
  "Un cycle se referme doucement, laissant place à des choix plus alignés avec ce que vous êtes devenu·e.",
];
const GA_AMOUR = ["En amour, la sincérité prime sur la stratégie — dites ce qui compte, sans détour.", "La vie affective bénéficie d'un ralentissement volontaire du rythme."];
const GA_CARRIERE = ["Côté carrière, un effort de fond commence à porter ses fruits, même sans reconnaissance immédiate.", "Une réorientation discrète se prépare, plus qu'un changement brutal."];
const GA_FINANCES = ["Sur le plan financier, la prudence mesurée l'emporte sur la prise de risque ces prochaines semaines.", "Un ajustement budgétaire simple libère plus de marge que prévu."];
const GA_SANTE = ["Côté santé, le corps demande de la régularité plus que des efforts ponctuels intenses.", "Le sommeil est le levier le plus rentable de cette période."];
const GA_FAMILLE = ["Du côté de la famille, une clarification de rôle apaise une tension latente.", "Un lien familial ancien mérite d'être renoué, sans attendre une occasion parfaite."];
const GA_EVOLUTION = ["Sur le plan personnel, vous gagnez à consolider plutôt qu'à multiplier les chantiers.", "Une prise de recul volontaire ouvre une clarté que l'agitation empêchait de voir."];
const GA_CONSEIL = ["Le conseil central de cette période : choisissez un axe et allez-y jusqu'au bout avant d'en ouvrir un autre.", "Le conseil central : ce qui est simple est souvent ce qui est juste — méfiez-vous des solutions trop compliquées."];
const GA_PERIODES = ['les quatre prochaines semaines', 'ce trimestre', 'les prochaines semaines', 'la période à venir'];

export function fallbackGrandeAnalyse(signKey: string, seedKey: string) {
  const rng = mulberry32(hashStr('grande::' + signKey + '::' + seedKey));
  return {
    synthese: pick(rng, GA_SYNTHESE),
    amour: pick(rng, GA_AMOUR),
    carriere: pick(rng, GA_CARRIERE),
    finances: pick(rng, GA_FINANCES),
    sante: pick(rng, GA_SANTE),
    famille: pick(rng, GA_FAMILLE),
    evolutionPersonnelle: pick(rng, GA_EVOLUTION),
    scoreAmour: range(rng, 35, 96),
    scoreCarriere: range(rng, 35, 96),
    scoreSante: range(rng, 35, 96),
    scoreFinances: range(rng, 35, 96),
    conseilPrincipal: pick(rng, GA_CONSEIL),
    periodeCle: pick(rng, GA_PERIODES),
  };
}
