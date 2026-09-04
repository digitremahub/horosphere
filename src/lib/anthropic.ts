import { Sign, decanOf } from './zodiac';
import { currentPlanetPositions, zodiacSignAt } from './planets';
import { moonPhaseInfo } from '../components/MoonPhase';
import { THEMES, type ThemeKey } from './themes';
import {
  fallbackHoroscope,
  fallbackAstralChart,
  fallbackSentiment,
  fallbackCompatibility,
  fallbackGrandeAnalyse,
  fallbackThematic,
  fallbackLunarCycle,
  fallbackTransits,
} from './fallback-generator';

export type HoroscopeReading = {
  headline: string;
  amour: string;
  travail: string;
  energie: string;
  conseil: string;
  scoreAmour: number;
  scoreTravail: number;
  scoreEnergie: number;
  couleur: string;
  chiffre: number;
  talisman: string;
  mode: 'ia' | 'demo';
};

export type AstralChart = {
  portrait: string;
  forces: string;
  defis: string;
  amour: string;
  carriere: string;
  spiritualite: string;
  scoreAmour: number;
  scoreCarriere: number;
  scoreSpiritualite: number;
  conseilDeVie: string;
  pierrePorteBonheur: string;
  symboleCle: string;
  mode: 'ia' | 'demo';
};

type Options = {
  feature: 'horoscope_quotidien' | 'horoscope_personnalise';
  sign: Sign;
  dateISO: string;
  naissance?: { date: string; heure?: string; lieu?: string };
};

type AstralOptions = {
  sign: Sign;
  naissance: { date: string; heure?: string; lieu?: string };
};

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const clampScore = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 50)));

/** Appelle l'API Anthropic avec un prompt donné et renvoie l'objet JSON
 * qu'elle a répondu. Partagé par generateHoroscope et generateAstralChart
 * pour éviter de dupliquer la logique de fetch/parsing. */
export async function callClaude(apiKey: string, model: string, prompt: string, maxTokens: number): Promise<any> {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, temperature: 0.9, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Appel Anthropic échoué (${res.status}): ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  const text: string = data?.content?.[0]?.text ?? '';
  const jsonText = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  try {
    return JSON.parse(jsonText);
  } catch {
    const match = jsonText.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch {}
    }
    throw new Error("Réponse de l'IA illisible (JSON invalide).");
  }
}

export async function generateHoroscope(opts: Options): Promise<HoroscopeReading> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Mode démo : pas de clé configurée, on utilise le générateur local déterministe.
    return { ...fallbackHoroscope(opts.sign.key, opts.dateISO), mode: 'demo' };
  }
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
  const contexte =
    opts.feature === 'horoscope_personnalise' && opts.naissance
      ? `Informations de naissance fournies par l'utilisateur : date ${opts.naissance.date}` +
        (opts.naissance.heure ? `, heure ${opts.naissance.heure}` : '') +
        (opts.naissance.lieu ? `, lieu ${opts.naissance.lieu}` : '') +
        `. Utilise-les pour personnaliser subtilement le ton, sans inventer de calculs astronomiques précis.`
      : `Horoscope général du jour pour ce signe (pas de données de naissance précises).`;
  const prompt = `Tu écris l'horoscope du jour pour l'application Horosphère, en français, pour le signe ${opts.sign.nom} (élément ${opts.sign.element}, planète maîtresse ${opts.sign.planete}). Date du jour : ${opts.dateISO}.
${contexte}
Ton : chaleureux, concret, bienveillant, jamais culpabilisant ni anxiogène. Phrases courtes, une émotion à la fois. Évite les répétitions d'un jour à l'autre.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :
{
  "headline": "phrase d'accroche de 5 à 9 mots",
  "amour": "1 à 2 phrases sur le plan sentimental",
  "travail": "1 à 2 phrases sur le plan professionnel",
  "energie": "1 à 2 phrases sur la forme physique et mentale",
  "conseil": "une phrase impérative courte, actionnable pour aujourd'hui",
  "scoreAmour": nombre entier entre 30 et 98,
  "scoreTravail": nombre entier entre 30 et 98,
  "scoreEnergie": nombre entier entre 30 et 98,
  "couleur": "nom d'une couleur porte-bonheur en français",
  "chiffre": nombre entier entre 1 et 49,
  "talisman": "un petit objet porte-bonheur, ex: une clé, une plume"
}`;
  const parsed = await callClaude(apiKey, model, prompt, 700);
  return {
    headline: String(parsed.headline ?? '').slice(0, 200),
    amour: String(parsed.amour ?? ''),
    travail: String(parsed.travail ?? ''),
    energie: String(parsed.energie ?? ''),
    conseil: String(parsed.conseil ?? ''),
    scoreAmour: clampScore(parsed.scoreAmour),
    scoreTravail: clampScore(parsed.scoreTravail),
    scoreEnergie: clampScore(parsed.scoreEnergie),
    couleur: String(parsed.couleur ?? 'Or'),
    chiffre: Math.max(1, Math.min(49, Math.round(Number(parsed.chiffre) || 7))),
    talisman: String(parsed.talisman ?? 'une bougie'),
    mode: 'ia',
  };
}

/** Thème astral complet — portrait de fond basé sur le signe solaire et les
 * informations de naissance du profil. On ne prétend jamais calculer une
 * position astronomique précise (ascendant, lune) : contenu qualitatif. */
export async function generateAstralChart(opts: AstralOptions): Promise<AstralChart> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ...fallbackAstralChart(opts.sign.key, opts.naissance.date + opts.naissance.lieu), mode: 'demo' };
  }
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
  const contexteNaissance =
    `Informations de naissance : date ${opts.naissance.date}` +
    (opts.naissance.heure ? `, heure ${opts.naissance.heure}` : '') +
    (opts.naissance.lieu ? `, lieu ${opts.naissance.lieu}` : '') +
    `.`;
  const prompt = `Tu écris le thème astral complet d'un utilisateur de l'application Horosphère, en français, pour le signe solaire ${opts.sign.nom} (élément ${opts.sign.element}, planète maîtresse ${opts.sign.planete}).
${contexteNaissance}
Utilise ces informations pour enrichir le ton, sans jamais prétendre calculer une position astronomique précise (pas d'ascendant, de lune ou de maison inventés — reste qualitatif, basé sur le signe solaire).
Ton : chaleureux, dense mais accessible, valorisant sans flatterie vide, jamais fataliste. Portrait de fond, pas une prédiction du jour.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :
{
  "portrait": "3 à 5 phrases de portrait de personnalité général, basé sur le signe",
  "forces": "1 à 2 phrases sur les forces principales",
  "defis": "1 à 2 phrases sur le principal axe de progression",
  "amour": "1 à 2 phrases sur la dynamique amoureuse de fond",
  "carriere": "1 à 2 phrases sur la dynamique professionnelle de fond",
  "spiritualite": "1 à 2 phrases sur l'équilibre intérieur",
  "scoreAmour": nombre entier entre 30 et 98,
  "scoreCarriere": nombre entier entre 30 et 98,
  "scoreSpiritualite": nombre entier entre 30 et 98,
  "conseilDeVie": "un conseil de fond, valable sur la durée",
  "pierrePorteBonheur": "nom d'une pierre porte-bonheur en français",
  "symboleCle": "un symbole clé du thème, ex: une clé ancienne, un compas"
}`;
  const parsed = await callClaude(apiKey, model, prompt, 1200);
  return {
    portrait: String(parsed.portrait ?? ''),
    forces: String(parsed.forces ?? ''),
    defis: String(parsed.defis ?? ''),
    amour: String(parsed.amour ?? ''),
    carriere: String(parsed.carriere ?? ''),
    spiritualite: String(parsed.spiritualite ?? ''),
    scoreAmour: clampScore(parsed.scoreAmour),
    scoreCarriere: clampScore(parsed.scoreCarriere),
    scoreSpiritualite: clampScore(parsed.scoreSpiritualite),
    conseilDeVie: String(parsed.conseilDeVie ?? ''),
    pierrePorteBonheur: String(parsed.pierrePorteBonheur ?? 'Améthyste'),
    symboleCle: String(parsed.symboleCle ?? 'une clé ancienne'),
    mode: 'ia',
  };
}

export type SentimentReading = {
  titre: string;
  dominante: string;
  enJeu: string;
  relations: string;
  conseil: string;
  scoreClarte: number;
  scoreIntensite: number;
  motCle: string;
  mode: 'ia' | 'demo';
};

/** Analyse sentimentale hebdomadaire — portée d'une semaine (pas du jour),
 * régénérée de façon stable pour la semaine ISO en cours. */
export async function generateSentiment(opts: { sign: Sign; weekKey: string }): Promise<SentimentReading> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ...fallbackSentiment(opts.sign.key, opts.weekKey), mode: 'demo' };
  }
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
  const prompt = `Tu écris une analyse sentimentale hebdomadaire pour l'application Horosphère, en français, pour le signe ${opts.sign.nom} (élément ${opts.sign.element}). Portée : la semaine en cours (semaine ${opts.weekKey}), pas la journée.
Ton : chaleureux, introspectif, jamais culpabilisant ni fataliste. Une seule idée par phrase.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :
{
  "titre": "titre court de 3 à 6 mots pour cette semaine",
  "dominante": "1 à 2 phrases sur l'émotion ou le besoin dominant de la semaine",
  "enJeu": "1 à 2 phrases sur ce qui se joue ou se transforme intérieurement",
  "relations": "1 à 2 phrases sur l'impact dans les relations proches",
  "conseil": "une phrase impérative courte, actionnable cette semaine",
  "scoreClarte": nombre entier entre 30 et 98,
  "scoreIntensite": nombre entier entre 20 et 95,
  "motCle": "un seul mot résumant la semaine, en français"
}`;
  const parsed = await callClaude(apiKey, model, prompt, 500);
  return {
    titre: String(parsed.titre ?? ''),
    dominante: String(parsed.dominante ?? ''),
    enJeu: String(parsed.enJeu ?? ''),
    relations: String(parsed.relations ?? ''),
    conseil: String(parsed.conseil ?? ''),
    scoreClarte: clampScore(parsed.scoreClarte),
    scoreIntensite: clampScore(parsed.scoreIntensite),
    motCle: String(parsed.motCle ?? 'Clarté'),
    mode: 'ia',
  };
}

export type CompatibilityReading = {
  scoreGlobal: number;
  resume: string;
  pointsForts: string;
  pointsFriction: string;
  amour: string;
  communication: string;
  conseil: string;
  mode: 'ia' | 'demo';
};

/** Compatibilité amoureuse entre l'utilisateur et une seconde personne
 * choisie librement — la seule lecture qui compare à un profil qui n'est
 * pas le sien. Affinée avec le prénom et la date de naissance exacte des
 * deux personnes (décan, en plus du seul signe solaire), jamais avec des
 * positions astronomiques inventées (pas d'ascendant, de maison ou de
 * transit calculé). */
export async function generateCompatibility(opts: {
  prenom: string;
  sign: Sign;
  dateNaissance: string;
  autrePrenom: string;
  autreSign: Sign;
  autreDateNaissance: string;
  seedKey: string;
}): Promise<CompatibilityReading> {
  const [, m1, d1] = opts.dateNaissance.split('-').map(Number);
  const [, m2, d2] = opts.autreDateNaissance.split('-').map(Number);
  const decan1 = decanOf(opts.sign, m1, d1);
  const decan2 = decanOf(opts.autreSign, m2, d2);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ...fallbackCompatibility({
        prenom: opts.prenom,
        signKey: opts.sign.key,
        decan: decan1,
        autrePrenom: opts.autrePrenom,
        autreSignKey: opts.autreSign.key,
        autreDecan: decan2,
        seedKey: opts.seedKey,
      }),
      mode: 'demo',
    };
  }
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
  const prompt = `Tu écris une analyse de compatibilité amoureuse pour l'application Horosphère, en français, entre deux personnes :
- ${opts.prenom}, signe ${opts.sign.nom} (élément ${opts.sign.element}), ${decan1}e décan (né(e) le ${opts.dateNaissance})
- ${opts.autrePrenom}, signe ${opts.autreSign.nom} (élément ${opts.autreSign.element}), ${decan2}e décan (né(e) le ${opts.autreDateNaissance})
Utilise les deux prénoms directement dans le texte plutôt que de dire "l'un" et "l'autre". Le décan (tiers du signe selon la date exacte de naissance) doit nuancer l'analyse sans jamais prétendre calculer une position astronomique précise (pas d'ascendant, de maison ou de transit inventés).
Ton : nuancé, jamais binaire ("ça marche" / "ça marche pas"), valorise les deux personnes, reste concret. Pas de fatalisme.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :
{
  "scoreGlobal": nombre entier entre 35 et 98,
  "resume": "1 à 2 phrases de résumé de cette entente",
  "pointsForts": "1 à 2 phrases sur les points forts du duo",
  "pointsFriction": "1 à 2 phrases sur le principal point de friction, formulé avec bienveillance",
  "amour": "1 à 2 phrases sur la dynamique amoureuse spécifique",
  "communication": "1 à 2 phrases sur la façon dont ce duo communique le mieux",
  "conseil": "un conseil concret pour faire durer cette relation"
}`;
  const parsed = await callClaude(apiKey, model, prompt, 700);
  return {
    scoreGlobal: clampScore(parsed.scoreGlobal),
    resume: String(parsed.resume ?? ''),
    pointsForts: String(parsed.pointsForts ?? ''),
    pointsFriction: String(parsed.pointsFriction ?? ''),
    amour: String(parsed.amour ?? ''),
    communication: String(parsed.communication ?? ''),
    conseil: String(parsed.conseil ?? ''),
    mode: 'ia',
  };
}

export type GrandeAnalyse = {
  synthese: string;
  amour: string;
  carriere: string;
  finances: string;
  sante: string;
  famille: string;
  evolutionPersonnelle: string;
  scoreAmour: number;
  scoreCarriere: number;
  scoreSante: number;
  scoreFinances: number;
  conseilPrincipal: string;
  periodeCle: string;
  mode: 'ia' | 'demo';
};

/** Grande analyse personnalisée — le bilan le plus complet, tous les axes
 * de vie (contrairement au thème astral, qui reste un portrait de fond, ou
 * à l'horoscope, limité au jour). Basée sur le profil de naissance. */
export async function generateGrandeAnalyse(opts: { sign: Sign; naissance: { date: string; heure?: string; lieu?: string } }): Promise<GrandeAnalyse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ...fallbackGrandeAnalyse(opts.sign.key, opts.naissance.date + opts.naissance.lieu), mode: 'demo' };
  }
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
  const contexteNaissance =
    `Informations de naissance : date ${opts.naissance.date}` +
    (opts.naissance.heure ? `, heure ${opts.naissance.heure}` : '') +
    (opts.naissance.lieu ? `, lieu ${opts.naissance.lieu}` : '') +
    `.`;
  const prompt = `Tu écris une grande analyse personnalisée pour l'application Horosphère, en français, pour le signe ${opts.sign.nom} (élément ${opts.sign.element}, planète maîtresse ${opts.sign.planete}). ${contexteNaissance}
C'est le bilan le plus complet proposé par l'application : couvre tous les grands axes de vie (amour, carrière, finances, santé, famille, évolution personnelle), pas seulement un portrait de fond. Ne prétends jamais calculer une position astronomique précise (pas d'ascendant, de maison ou de transit inventés) — reste qualitatif, basé sur le signe solaire et les informations fournies.
Ton : dense, structuré, valorisant sans flatterie vide, jamais anxiogène.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :
{
  "synthese": "3 à 4 phrases de synthèse générale de la période",
  "amour": "1 à 2 phrases sur l'axe amoureux",
  "carriere": "1 à 2 phrases sur l'axe carrière",
  "finances": "1 à 2 phrases sur l'axe financier",
  "sante": "1 à 2 phrases sur l'axe santé/énergie",
  "famille": "1 à 2 phrases sur l'axe famille/entourage",
  "evolutionPersonnelle": "1 à 2 phrases sur l'évolution personnelle",
  "scoreAmour": nombre entier entre 30 et 98,
  "scoreCarriere": nombre entier entre 30 et 98,
  "scoreSante": nombre entier entre 30 et 98,
  "scoreFinances": nombre entier entre 30 et 98,
  "conseilPrincipal": "le conseil central de cette analyse, 1 phrase",
  "periodeCle": "une expression courte de période, ex: 'les quatre prochaines semaines'"
}`;
  const parsed = await callClaude(apiKey, model, prompt, 1400);
  return {
    synthese: String(parsed.synthese ?? ''),
    amour: String(parsed.amour ?? ''),
    carriere: String(parsed.carriere ?? ''),
    finances: String(parsed.finances ?? ''),
    sante: String(parsed.sante ?? ''),
    famille: String(parsed.famille ?? ''),
    evolutionPersonnelle: String(parsed.evolutionPersonnelle ?? ''),
    scoreAmour: clampScore(parsed.scoreAmour),
    scoreCarriere: clampScore(parsed.scoreCarriere),
    scoreSante: clampScore(parsed.scoreSante),
    scoreFinances: clampScore(parsed.scoreFinances),
    conseilPrincipal: String(parsed.conseilPrincipal ?? ''),
    periodeCle: String(parsed.periodeCle ?? 'les prochaines semaines'),
    mode: 'ia',
  };
}

export type ThematicReading = {
  titre: string;
  texte: string;
  pointAttention: string;
  conseil: string;
  score: number;
  mode: 'ia' | 'demo';
};

/** Les 6 lectures thématiques "simples" (voir lib/themes.ts) partagent un
 * seul générateur, paramétré par thème, plutôt que 6 fonctions quasi
 * identiques. */
export async function generateThematic(opts: { theme: ThemeKey; sign: Sign; seedKey: string }): Promise<ThematicReading> {
  const meta = THEMES[opts.theme];
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { titre: meta.titreCard, ...fallbackThematic(opts.theme, opts.sign.key, opts.seedKey), mode: 'demo' };
  }
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
  const prompt = `Tu écris une lecture astrologique thématique pour l'application Horosphère, en français, pour le signe ${opts.sign.nom} (élément ${opts.sign.element}, planète maîtresse ${opts.sign.planete}). Thème : ${meta.axe}. Portée : ${meta.portee}.
${meta.consigne}
Ton : chaleureux, concret, bienveillant, jamais culpabilisant ni anxiogène.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :
{
  "titre": "titre court de 3 à 7 mots",
  "texte": "2 à 4 phrases sur cet axe précis",
  "pointAttention": "1 phrase sur un point à surveiller ou à ne pas négliger",
  "conseil": "une phrase impérative courte, actionnable",
  "score": nombre entier entre 30 et 98
}`;
  const parsed = await callClaude(apiKey, model, prompt, 500);
  return {
    titre: String(parsed.titre ?? meta.titreCard),
    texte: String(parsed.texte ?? ''),
    pointAttention: String(parsed.pointAttention ?? ''),
    conseil: String(parsed.conseil ?? ''),
    score: clampScore(parsed.score),
    mode: 'ia',
  };
}

export type LunarCycleReading = {
  titre: string;
  interpretation: string;
  conseil: string;
  phase: number;
  phaseLabel: string;
  illumination: number;
  mode: 'ia' | 'demo';
};

/** Lecture calée sur la phase lunaire réelle du jour (même calcul que la
 * section "Lune du jour" de la page d'accueil), interprétée pour le signe
 * de l'utilisateur. `phase` (0-1) est conservée pour pouvoir redessiner la
 * même silhouette de lune dans l'historique, plutôt que la phase du jour. */
export async function generateLunarCycle(opts: { sign: Sign }): Promise<LunarCycleReading> {
  const moon = moonPhaseInfo();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { titre: 'Cycle lunaire', ...fallbackLunarCycle(opts.sign.key, moon.label), phase: moon.phase, phaseLabel: moon.label, illumination: moon.illumination, mode: 'demo' };
  }
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
  const prompt = `Tu écris une lecture "cycle lunaire" pour l'application Horosphère, en français, pour le signe ${opts.sign.nom} (élément ${opts.sign.element}).
Phase lunaire réelle du jour : ${moon.label}, illuminée à ${moon.illumination}%. N'invente pas d'autre phase que celle-ci.
Ton : chaleureux, contemplatif, concret.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :
{
  "titre": "titre court de 3 à 6 mots",
  "interpretation": "2 à 3 phrases reliant cette phase lunaire réelle au signe de l'utilisateur",
  "conseil": "une phrase impérative courte, actionnable, en lien avec cette phase"
}`;
  const parsed = await callClaude(apiKey, model, prompt, 400);
  return {
    titre: String(parsed.titre ?? 'Cycle lunaire'),
    interpretation: String(parsed.interpretation ?? ''),
    conseil: String(parsed.conseil ?? ''),
    phase: moon.phase,
    phaseLabel: moon.label,
    illumination: moon.illumination,
    mode: 'ia',
  };
}

export type TransitsReading = {
  titre: string;
  interpretation: string;
  conseil: string;
  planetesEnFocus: { nom: string; glyphe: string; signe: string }[];
  mode: 'ia' | 'demo';
};

const RULER_TO_PLANET_KEY: Record<string, string> = {
  Soleil: 'soleil',
  Lune: 'lune',
  Mercure: 'mercure',
  Vénus: 'venus',
  Mars: 'mars',
  Jupiter: 'jupiter',
  Saturne: 'saturne',
};

/** Lecture basée sur les positions planétaires réelles du jour (même calcul
 * que la roue de la page d'accueil, voir lib/planets.ts) : met en avant le
 * Soleil, la Lune, et la planète maîtresse du signe de l'utilisateur. */
export async function generateTransits(opts: { sign: Sign }): Promise<TransitsReading> {
  const positions = currentPlanetPositions();
  const byKey = new Map(positions.map((p) => [p.key, p]));
  const rulerKey = RULER_TO_PLANET_KEY[opts.sign.planete];
  const focusKeys = Array.from(new Set(['soleil', 'lune', rulerKey && byKey.has(rulerKey) ? rulerKey : 'mercure']));
  const planetesEnFocus = focusKeys
    .map((key) => byKey.get(key))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({ nom: p.nom, glyphe: p.glyphe, signe: zodiacSignAt(p.longitude).nom }));

  const contexte = planetesEnFocus.map((p) => `${p.nom} est actuellement en ${p.signe}`).join(', ') + '.';

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { titre: 'Transits planétaires', ...fallbackTransits(opts.sign.key, contexte), planetesEnFocus, mode: 'demo' };
  }
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
  const prompt = `Tu écris une lecture "transits planétaires" pour l'application Horosphère, en français, pour le signe ${opts.sign.nom} (élément ${opts.sign.element}, planète maîtresse ${opts.sign.planete}).
Position réelle actuelle des planètes : ${contexte} N'invente aucune autre position planétaire que celles données.
Ton : concret, jamais fataliste, évite le jargon technique (pas d'aspects en degrés).
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :
{
  "titre": "titre court de 3 à 6 mots",
  "interpretation": "2 à 3 phrases reliant ces positions réelles au signe de l'utilisateur",
  "conseil": "une phrase impérative courte, actionnable"
}`;
  const parsed = await callClaude(apiKey, model, prompt, 450);
  return {
    titre: String(parsed.titre ?? 'Transits planétaires'),
    interpretation: String(parsed.interpretation ?? ''),
    conseil: String(parsed.conseil ?? ''),
    planetesEnFocus,
    mode: 'ia',
  };
}
