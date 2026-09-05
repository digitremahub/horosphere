// Générateur déterministe utilisé quand ANTHROPIC_API_KEY n'est pas encore
// configurée, pour que le produit reste démontrable pendant la mise en
// place du backend IA. Même principe que le tout premier MVP : un hash de
// (date + signe) sélectionne des phrases dans des banques de texte FR.

import type { ThemeKey } from './themes';
import { SIGNS } from './zodiac';

// Douze entrées par banque (au moins) — une par signe : voir pickDistinct
// ci-dessous, qui garantit que les 12 signes reçoivent 12 textes différents
// pour une même date plutôt que de piocher indépendamment dans une petite
// banque (où le paradoxe des anniversaires rend les doublons visibles quasi
// certains dès que plusieurs personnes comparent leur signe côte à côte,
// ex: l'aperçu gratuit de la page d'accueil).
const HEADLINES = [
  'Le ciel vous ouvre une porte discrète.',
  'Une journée à avancer à votre rythme.',
  'Les astres appellent à la patience.',
  'Un vent nouveau souffle sur vos projets.',
  'Le moment est bon pour trancher.',
  'Une clarté inattendue éclaire votre chemin.',
  "L'instant présent mérite toute votre attention.",
  'Un pas de côté révèle une meilleure vue.',
  'La journée récompense ceux qui écoutent leur instinct.',
  'Un déclic discret change la couleur de la journée.',
  'Le terrain est favorable à une initiative sincère.',
  "Les astres invitent à ralentir avant d'avancer.",
];

const AMOUR = [
  'En amour, vous attirez les échanges sincères si vous restez disponible.',
  "Côté cœur, une parole en suspens mérite d'être prononcée aujourd'hui.",
  'Une rencontre ou un message pourrait changer la tonalité de votre journée.',
  'La tendresse se niche dans les petits gestes plus que les grandes déclarations.',
  'Un malentendu ancien peut se dénouer si vous osez en reparler calmement.',
  "L'harmonie sentimentale passe aujourd'hui par l'écoute plus que par les mots.",
  'Une complicité retrouvée réchauffe une relation qui en avait besoin.',
  'Le cœur gagne à rester ouvert, même face à une hésitation passagère.',
  'Une déclaration honnête vaut mieux qu’un silence prudent, aujourd’hui.',
  'Votre magnétisme naturel attire les bonnes personnes, à condition de le laisser paraître.',
  'Un moment à deux, même bref, suffit à raviver une connexion.',
  'La patience en amour porte ses fruits plus vite que prévu.',
];

const TRAVAIL = [
  'Au travail, une idée que vous portez depuis un moment mérite d’être formulée à voix haute.',
  'La journée favorise la méthode plus que la précipitation.',
  'Une décision reportée peut enfin être prise.',
  'Une collaboration inattendue ouvre une porte que vous n’aviez pas vue.',
  'Le sérieux de vos efforts récents commence à porter ses fruits.',
  'Un imprévu professionnel se résout mieux avec calme qu’avec insistance.',
  'C’est le bon moment pour clarifier une attente restée floue avec un collègue.',
  'Votre rigueur est remarquée, même sans retour immédiat.',
  'Une petite victoire du jour mérite d’être reconnue, y compris par vous-même.',
  'L’organisation prend le pas sur l’improvisation aujourd’hui, et c’est tant mieux.',
  'Une proposition audacieuse a de bonnes chances d’être entendue.',
  'Le travail de fond que vous menez discrètement commence à se voir.',
];

const ENERGIE = [
  "Sur le plan physique, l'énergie est bonne si vous respectez vos limites.",
  "Une marche ou un moment au grand air fait plus de bien qu'un effort intense.",
  'Votre énergie est stable, idéale pour tenir un rythme régulier.',
  'Un sommeil réparateur cette nuit change la donne pour toute la journée.',
  "L'envie de bouger se fait sentir — suivez-la sans forcer.",
  'Une pause consciente vaut mieux qu’un effort supplémentaire aujourd’hui.',
  'Votre corps réclame de la douceur plus que de la performance.',
  'Un regain de vitalité arrive en fin de journée — gardez-vous en un peu.',
  'L’équilibre entre repos et activité est votre meilleur allié aujourd’hui.',
  'Une respiration profonde suffit parfois à relancer toute la machine.',
  'Votre énergie mentale est plus vive que d’habitude, profitez-en pour trancher.',
  'Le corps suit si l’esprit est apaisé — commencez par calmer ce dernier.',
];

const CONSEILS = [
  'Osez poser la question qui vous trotte en tête.',
  'Accordez-vous une heure sans écran.',
  'Prenez des nouvelles d’une personne que vous négligez.',
  'Notez une idée avant qu’elle ne s’échappe.',
  'Dites non à ce qui ne vous convient plus.',
  'Offrez-vous un vrai moment de pause, sans culpabilité.',
  'Réglez aujourd’hui ce petit détail qui traîne depuis trop longtemps.',
  'Faites confiance à votre première impression.',
  'Accordez-vous le droit de changer d’avis.',
  'Célébrez une réussite, même modeste.',
  'Prenez une décision plutôt que de continuer à peser le pour et le contre.',
  'Écoutez ce que votre corps essaie de vous dire depuis un moment.',
];

const COULEURS = ['Or', 'Bleu nuit', 'Lilas', 'Corail', 'Vert sauge', 'Bordeaux', 'Argent', 'Turquoise', 'Terracotta', 'Ivoire', 'Prune', 'Ambre'];
const TALISMANS = ['une clé', 'une bougie', 'une plume', 'une étoile', 'une boussole', 'un galet', 'une coquille', 'un ruban', 'une pierre polie', 'un carnet', 'une lanterne', 'un fil rouge'];

// Exportées : réutilisées par lib/social.ts pour le mode démo du contenu
// réseaux sociaux, sur le même principe (hash déterministe -> choix stable).
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function range(rng: () => number, min: number, max: number): number {
  return Math.round(min + rng() * (max - min));
}

/** Mélange déterministe (Fisher-Yates) de [0..n-1], pour une seed donnée. */
function shuffledIndices(seed: number, n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  const rng = mulberry32(seed);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Choisit un élément de `arr` pour `signKey`, de façon à ce que — pour une
 * même `varyKey` (ex: la date du jour) — chacun des 12 signes reçoive un
 * élément différent des 11 autres, plutôt qu'une pioche indépendante par
 * signe (qui produirait des doublons visibles dès que deux personnes
 * comparent leur signe côte à côte, par paradoxe des anniversaires). `arr`
 * doit contenir au moins autant d'entrées que de signes du zodiaque. */
function pickDistinct<T>(varyKey: string, field: string, signKey: string, arr: T[]): T {
  const signIndex = SIGNS.findIndex((s) => s.key === signKey);
  const perm = shuffledIndices(hashStr(varyKey + '::' + field), SIGNS.length);
  return arr[perm[signIndex === -1 ? 0 : signIndex] % arr.length];
}

export function fallbackHoroscope(signKey: string, dateISO: string) {
  const rng = mulberry32(hashStr(dateISO + '::' + signKey));
  return {
    headline: pickDistinct(dateISO, 'headline', signKey, HEADLINES),
    amour: pickDistinct(dateISO, 'amour', signKey, AMOUR),
    travail: pickDistinct(dateISO, 'travail', signKey, TRAVAIL),
    energie: pickDistinct(dateISO, 'energie', signKey, ENERGIE),
    conseil: pickDistinct(dateISO, 'conseil', signKey, CONSEILS),
    scoreAmour: range(rng, 35, 97),
    scoreTravail: range(rng, 35, 97),
    scoreEnergie: range(rng, 35, 97),
    couleur: pickDistinct(dateISO, 'couleur', signKey, COULEURS),
    chiffre: range(rng, 1, 49),
    talisman: pickDistinct(dateISO, 'talisman', signKey, TALISMANS),
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
// Les modèles utilisent {prenom}/{autrePrenom} — remplacés à l'usage par les
// prénoms réels des deux personnes, pour que le mode démo reste personnalisé
// même sans clé IA.

const COMPAT_RESUME = [
  "{prenom} et {autrePrenom} forment un duo qui fonctionne par contraste : ce que l'un n'a pas, l'autre l'apporte naturellement.",
  "Entre {prenom} et {autrePrenom}, l'entente se construit dans la durée, pas dans l'évidence immédiate.",
  "{prenom} et {autrePrenom} sont deux tempéraments qui se reconnaissent vite, à condition de respecter le rythme de l'autre.",
];
const COMPAT_FORTS = [
  "Points forts : une complicité facile entre {prenom} et {autrePrenom}, et une capacité commune à se rassurer mutuellement.",
  "Points forts : {prenom} et {autrePrenom} respectent naturellement l'indépendance de l'autre, sans distance froide.",
  "Points forts : la communication s'installe sans effort entre {prenom} et {autrePrenom}, une fois la confiance posée.",
];
const COMPAT_FRICTION = [
  "Point de friction : le rythme d'engagement de {prenom} n'est pas toujours celui de {autrePrenom}.",
  "Point de friction : la gestion des désaccords demande à être apprivoisée avec le temps entre {prenom} et {autrePrenom}.",
  "Point de friction : {prenom} a besoin de parler quand {autrePrenom} a besoin de silence — un terrain d'entente existe.",
];
const COMPAT_AMOUR = [
  "Sur le plan amoureux, l'alchimie entre {prenom} et {autrePrenom} est réelle mais se révèle davantage dans la durée que dans l'instant.",
  "Entre {prenom} et {autrePrenom}, l'attirance est immédiate ; c'est la constance qui demandera un effort partagé.",
];
const COMPAT_COMMUNICATION = [
  "La communication passe mieux dans l'action partagée que dans les grandes discussions, pour {prenom} comme pour {autrePrenom}.",
  "Un mot dit au bon moment compte plus, pour ce duo, qu'un long discours.",
];
const COMPAT_CONSEIL = [
  "Laissez à cette relation le temps de trouver son propre rythme, sans le comparer à d'autres.",
  "{prenom} et {autrePrenom} gagnent à nommer leurs besoins clairement plutôt qu'à attendre qu'ils soient devinés.",
];

function interpole(texte: string, prenom: string, autrePrenom: string): string {
  return texte.replaceAll('{prenom}', prenom).replaceAll('{autrePrenom}', autrePrenom);
}

export function fallbackCompatibility(opts: {
  prenom: string;
  signKey: string;
  decan: 1 | 2 | 3;
  autrePrenom: string;
  autreSignKey: string;
  autreDecan: 1 | 2 | 3;
  seedKey: string;
}) {
  // La clé de hachage inclut les décans (issus des dates de naissance
  // exactes) : deux personnes du même signe mais nées à des moments
  // différents du signe obtiennent un résultat distinct.
  const pairKey = [`${opts.signKey}-${opts.decan}`, `${opts.autreSignKey}-${opts.autreDecan}`].sort().join('+');
  const rng = mulberry32(hashStr('compat::' + pairKey + '::' + opts.seedKey));
  const t = (texte: string) => interpole(texte, opts.prenom, opts.autrePrenom);
  return {
    scoreGlobal: range(rng, 45, 96),
    resume: t(pick(rng, COMPAT_RESUME)),
    pointsForts: t(pick(rng, COMPAT_FORTS)),
    pointsFriction: t(pick(rng, COMPAT_FRICTION)),
    amour: t(pick(rng, COMPAT_AMOUR)),
    communication: t(pick(rng, COMPAT_COMMUNICATION)),
    conseil: t(pick(rng, COMPAT_CONSEIL)),
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

// ===== Lectures thématiques simples (voir lib/themes.ts) =====

const THEMATIC_TEXTE: Record<ThemeKey, string[]> = {
  vision_hebdomadaire: [
    "La semaine s'annonce plus fluide qu'elle n'y paraît au premier abord.",
    "Un événement attendu se précise dans les prochains jours.",
    "Le rythme est irrégulier, mais l'ensemble converge vers du positif.",
  ],
  snapshot_natal: [
    "Votre thème natal révèle une nature qui apprend en avançant, plus qu'en planifiant.",
    "Le trait dominant de ce thème : une constance qui rassure sans jamais rien figer.",
    "Ce signe combine une énergie d'initiative et un besoin réel de sécurité affective.",
  ],
  horoscope_carriere: [
    "Une opportunité professionnelle se dessine, encore discrète mais réelle.",
    "La reconnaissance de vos efforts arrive, par un chemin détourné.",
    "Le moment est bon pour clarifier une attente avec un collègue ou un supérieur.",
  ],
  horoscope_amoureux: [
    "En amour, la sincérité prime sur la stratégie ces prochains jours.",
    "Une rencontre ou un message pourrait changer la tonalité de la période.",
    "Le cœur a besoin d'un peu d'espace : ne forcez rien inutilement.",
  ],
  aide_decision: [
    "La décision que vous repoussez a besoin de moins d'informations que de courage.",
    "Un avis extérieur peut éclairer ce choix, sans pour autant le remplacer.",
    "Le bon moment pour trancher se rapproche — la clarté vient en avançant, pas en attendant.",
  ],
  guidance_spirituelle: [
    "Un ralentissement volontaire ouvre une clarté que l'agitation empêchait de voir.",
    "Les rituels simples — un carnet, une marche, un silence choisi — vous ancrent plus qu'une quête compliquée.",
    "Ce cheminement avance par l'expérience concrète plus que par la théorie.",
  ],
};

const THEMATIC_ATTENTION: Record<ThemeKey, string[]> = {
  vision_hebdomadaire: ["Un imprévu de dernière minute demande de la souplesse.", "Ne laissez pas un détail administratif traîner trop longtemps."],
  snapshot_natal: ["Le principal défi : ne pas laisser le doute retarder des décisions déjà mûres.", "La patience envers le rythme des autres demande un effort conscient."],
  horoscope_carriere: ["Une seconde vérification évite un contretemps évitable.", "Ne surchargez pas votre semaine par excès d'enthousiasme."],
  horoscope_amoureux: ["Un non-dit ancien mérite d'être clarifié avant qu'il ne pèse davantage.", "Évitez de comparer cette relation à une autre, passée ou imaginée."],
  aide_decision: ["Méfiez-vous d'une solution qui semble trop simple pour être honnête.", "N'attendez pas la certitude totale : elle ne viendra pas avant d'agir."],
  guidance_spirituelle: ["Une quête trop intense peut devenir une fuite si elle empêche le repos.", "Ne confondez pas isolement et ressourcement."],
};

const THEMATIC_CONSEIL: Record<ThemeKey, string[]> = {
  vision_hebdomadaire: ['Choisissez une seule priorité pour cette semaine, pas cinq.', 'Bloquez un moment sans obligation, même court.'],
  snapshot_natal: ["Faites confiance au rythme qui est le vôtre.", "Un thème n'est pas un destin figé : c'est une carte, pas un itinéraire imposé."],
  horoscope_carriere: ['Formulez à voix haute une idée que vous portez depuis un moment.', 'Découpez la tâche en attente en petites étapes.'],
  horoscope_amoureux: ['Dites ce qui compte, sans détour.', "Accordez-vous le droit d'être disponible, même imparfaitement."],
  aide_decision: ['Écrivez les deux options et ce que chacune vous coûte réellement.', 'Fixez-vous une date limite raisonnable pour trancher.'],
  guidance_spirituelle: ['Offrez-vous un moment de silence aujourd\'hui.', 'Notez une intention simple avant de vous coucher.'],
};

export function fallbackThematic(theme: ThemeKey, signKey: string, seedKey: string) {
  const rng = mulberry32(hashStr('thematic::' + theme + '::' + signKey + '::' + seedKey));
  return {
    texte: pick(rng, THEMATIC_TEXTE[theme]),
    pointAttention: pick(rng, THEMATIC_ATTENTION[theme]),
    conseil: pick(rng, THEMATIC_CONSEIL[theme]),
    score: range(rng, 35, 96),
  };
}

// ===== Cycle lunaire (basé sur la phase réelle du jour) =====

const LUNAR_INTERPRETATIONS = [
  "Cette phase invite à ajuster votre énergie plutôt qu'à la forcer.",
  "La lune actuelle éclaire ce que vous hésitiez à regarder en face.",
  "Un cycle se referme doucement, laissant place à autre chose.",
];
const LUNAR_CONSEILS = [
  "Accordez-vous un rituel simple ce soir, même de deux minutes.",
  "Notez ce que cette phase vous inspire, sans chercher à l'analyser tout de suite.",
  "Laissez le rythme de la lune ralentir le vôtre, juste un instant.",
];

export function fallbackLunarCycle(signKey: string, phaseLabel: string) {
  const rng = mulberry32(hashStr('lunar::' + signKey + '::' + phaseLabel));
  return {
    interpretation: pick(rng, LUNAR_INTERPRETATIONS),
    conseil: pick(rng, LUNAR_CONSEILS),
  };
}

// ===== Transits planétaires (basé sur les positions réelles du jour) =====

const TRANSIT_INTERPRETATIONS = [
  "Ces positions favorisent une période d'ajustement plus que de grands bouleversements.",
  "L'influence du moment se ressent surtout dans les détails du quotidien.",
  "Une tension discrète entre deux domaines de votre vie s'apaise progressivement.",
];
const TRANSIT_CONSEILS = [
  "Observez ce qui se répète cette semaine : c'est souvent le signal le plus fiable.",
  "Avancez par petits ajustements plutôt que par grand geste.",
  "Le moment favorise l'observation avant l'action.",
];

export function fallbackTransits(signKey: string, contexte: string) {
  const rng = mulberry32(hashStr('transits::' + signKey + '::' + contexte));
  return {
    interpretation: pick(rng, TRANSIT_INTERPRETATIONS),
    conseil: pick(rng, TRANSIT_CONSEILS),
  };
}

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
