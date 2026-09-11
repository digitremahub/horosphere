import { Sign, decanOf } from './zodiac';
import { currentPlanetPositions, zodiacSignAt } from './planets';
import { calculerThemeNatal } from './natal';
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

export type Langue = 'fr' | 'en' | 'es';

// Les instructions de ces prompts restent rédigées en français (c'est la
// langue de travail de ce fichier) — seule la langue du CONTENU généré
// bascule selon la préférence de l'utilisateur (voir next-intl, src/i18n).
// consigneLangue() ajoute une directive explicite au prompt ; motLangue()
// s'utilise pour les mentions ponctuelles à l'intérieur du format JSON
// attendu (ex: "un seul mot résumant la semaine (...)").
const NOMS_LANGUE: Record<Exclude<Langue, 'fr'>, string> = { en: 'anglais', es: 'espagnol' };
function consigneLangue(langue: Langue): string {
  if (langue === 'fr') return '';
  return `\n\nIMPORTANT : rédige l'intégralité des champs texte de ta réponse UNIQUEMENT en ${NOMS_LANGUE[langue]} (pas en français), même si ces instructions te sont données en français. Les noms de champs JSON restent ceux indiqués ci-dessus, inchangés.`;
}
function motLangue(langue: Langue): string {
  if (langue === 'en') return 'in English';
  if (langue === 'es') return 'en español';
  return 'en français';
}

export type HoroscopeReading = {
  headline: string;
  amour: string;
  travail: string;
  energie: string;
  conseil: string;
  scoreAmour: number;
  scoreTravail: number;
  scoreEnergie: number;
  // Présents uniquement pour l'horoscope personnalisé, quand l'heure et le
  // lieu de naissance ont pu être résolus en thème natal réel (voir
  // lib/natal.ts) — jamais approximés, et jamais pour l'horoscope
  // quotidien générique (pas de profil de naissance associé).
  ascendantSigne?: { nom: string; symbole: string };
  luneSigne?: { nom: string; symbole: string };
  mode: 'ia' | 'demo';
};

// Positionnement Horosphère : le développement personnel PAR les astres —
// pas un horoscope-divertissement. On garde une voix affirmative (on croit
// réellement au pouvoir des astres, pas de distance sceptique façon "c'est
// symbolique") mais on bannit le FATALISME PASSIF ("voici ce qui va vous
// arriver") au profit de l'AGIR : chaque observation astrologique doit se
// prolonger en une implication concrète pour la personne — ce qu'elle peut
// comprendre, décider ou changer aujourd'hui — jamais une simple
// description de ce qui se passe autour d'elle. Partagée par tous les
// générateurs ci-dessous plutôt que répétée dans chaque prompt.
const DIRECTIVE_TON =
  "Ton : direct, chaleureux, jamais fataliste ni passif. Tu t'adresses à quelqu'un qui croit sincèrement au pouvoir des astres et qui vient chercher de quoi agir aujourd'hui. Chaque phrase relie une réalité astrologique à une implication concrète pour la personne : ce qu'elle peut comprendre, décider ou changer. Bannis les formules de destin figé (\"les astres vous révèlent votre destin\", \"il est écrit que...\") au profit d'un vocabulaire de clarté et d'action.";

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
  // Présents uniquement quand l'heure et le lieu de naissance ont pu être
  // résolus en un thème natal réel (voir lib/natal.ts) — jamais approximés.
  ascendantSigne?: { nom: string; symbole: string };
  luneSigne?: { nom: string; symbole: string };
  mode: 'ia' | 'demo';
};

type Options = {
  feature: 'horoscope_quotidien' | 'horoscope_personnalise';
  sign: Sign;
  dateISO: string;
  naissance?: { date: string; heure?: string; lieu?: string; latitude?: number | null; longitude?: number | null; timezone?: string | null };
  langue?: Langue;
  prenom?: string;
};

type AstralOptions = {
  sign: Sign;
  naissance: { date: string; heure?: string; lieu?: string; latitude?: number | null; longitude?: number | null; timezone?: string | null };
  langue?: Langue;
  prenom?: string;
};

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const clampScore = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 50)));

/** Insère le prénom de l'utilisateur en apostrophe au début du texte
 * d'ouverture d'une lecture ("Léa, le ciel vous ouvre une porte..."),
 * plutôt qu'en préambule mécanique séparé ("Bonjour Léa,") — s'accorde
 * avec le tutoiement/vouvoiement déjà présent dans le texte, IA comme
 * démo. Ne fait rien sans prénom (ex: aperçu public anonyme de la
 * homepage, ou horoscope envoyé par e-mail qui a déjà son propre
 * "Bonjour {prénom}," — voir lib/dailyHoroscopeEmail.ts). */
function avecPrenom(prenom: string | undefined, texte: string): string {
  const nom = prenom?.trim();
  if (!nom || !texte) return texte;
  return `${nom}, ${texte.charAt(0).toLowerCase()}${texte.slice(1)}`;
}

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
    // Next.js met en cache les fetch() faits côté serveur (Data Cache), y
    // compris en POST, en se basant sur l'URL + le corps de la requête. Or
    // le corps ici est quasi-identique d'un appel à l'autre pour un même
    // article (même prompt de traduction) : sans no-store, un premier appel
    // qui échoue silencieusement (l'IA renvoie le texte source, sans lever
    // d'erreur) reste mis en cache et est reservi indéfiniment tel quel à
    // chaque nouvelle tentative — retenter n'appelait alors jamais vraiment
    // l'API Anthropic une seconde fois. C'est ce qui a rendu le bug de
    // traduction figée reproductible à coup sûr plutôt qu'aléatoire.
    cache: 'no-store',
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
  const langue = opts.langue ?? 'fr';
  const naissance = opts.feature === 'horoscope_personnalise' ? opts.naissance : undefined;
  const themeNatal =
    naissance?.heure && naissance.latitude != null && naissance.longitude != null && naissance.timezone
      ? calculerThemeNatal(naissance.date, naissance.heure, naissance.timezone, naissance.latitude, naissance.longitude)
      : null;
  const natalExtra = themeNatal
    ? {
        ascendantSigne: { nom: themeNatal.ascendant.signe.nom, symbole: themeNatal.ascendant.signe.symbole },
        luneSigne: { nom: themeNatal.luneSigne.nom, symbole: themeNatal.luneSigne.symbole },
      }
    : {};

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Mode démo : pas de clé configurée, on utilise le générateur local déterministe.
    const demo = fallbackHoroscope(opts.sign.key, opts.dateISO, langue);
    return { ...demo, headline: avecPrenom(opts.prenom, demo.headline), ...natalExtra, mode: 'demo' };
  }
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
  const natalTxt = themeNatal
    ? ` Thème natal réel, calculé (à utiliser factuellement, n'en invente aucun autre élément) : ascendant ${themeNatal.ascendant.signe.nom}, lune natale en ${themeNatal.luneSigne.nom}.`
    : '';
  const contexte =
    opts.feature === 'horoscope_personnalise' && naissance
      ? `Informations de naissance fournies par l'utilisateur : date ${naissance.date}` +
        (naissance.heure ? `, heure ${naissance.heure}` : '') +
        (naissance.lieu ? `, lieu ${naissance.lieu}` : '') +
        `.${natalTxt} Utilise-les pour personnaliser subtilement le ton${themeNatal ? ' — tu peux mentionner l\'ascendant ou la lune natale ci-dessus, ce sont des éléments réels' : ', sans inventer de calculs astronomiques précis'}.`
      : `Horoscope général du jour pour ce signe (pas de données de naissance précises).`;
  const prompt = `Tu écris l'horoscope du jour pour l'application Horosphère, pour le signe ${opts.sign.nom} (élément ${opts.sign.element}, planète maîtresse ${opts.sign.planete}). Date du jour : ${opts.dateISO}.
${contexte}
${DIRECTIVE_TON} Une émotion à la fois, jamais culpabilisant ni anxiogène. Évite les répétitions d'un jour à l'autre.
Contenu attendu pour amour/travail/énergie : une vraie information exploitable, pas une généralité qui pourrait s'appliquer à n'importe quel signe n'importe quel jour. Nomme un mécanisme astrologique concret et propre au signe (transit, aspect, position planétaire, élément, planète maîtresse) puis développe CE QUE ÇA CHANGE PRÉCISÉMENT aujourd'hui — une situation plausible, un choix à faire, un risque à éviter. C'est un produit payant : la personne doit sentir qu'elle a appris quelque chose de spécifique à sa lecture, pas relu un horoscope générique.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :
{
  "headline": "phrase d'accroche de 5 à 9 mots, qui donne une direction pour la journée",
  "amour": "3 à 4 phrases denses sur le plan sentimental : le mécanisme astrologique du jour, la situation concrète qu'il éclaire, puis ce que ça implique aujourd'hui",
  "travail": "3 à 4 phrases denses sur le plan professionnel : le mécanisme astrologique du jour, la situation concrète qu'il éclaire, puis ce que ça implique aujourd'hui",
  "energie": "3 à 4 phrases denses sur la forme physique et mentale : le mécanisme astrologique du jour, la situation concrète qu'il éclaire, puis ce que ça implique aujourd'hui",
  "conseil": "une phrase impérative courte : l'action principale à mener aujourd'hui, le cœur de la lecture",
  "scoreAmour": nombre entier entre 30 et 98,
  "scoreTravail": nombre entier entre 30 et 98,
  "scoreEnergie": nombre entier entre 30 et 98
}${consigneLangue(langue)}`;
  const parsed = await callClaude(apiKey, model, prompt, 1100);
  return {
    headline: avecPrenom(opts.prenom, String(parsed.headline ?? '').slice(0, 200)),
    amour: String(parsed.amour ?? ''),
    travail: String(parsed.travail ?? ''),
    energie: String(parsed.energie ?? ''),
    conseil: String(parsed.conseil ?? ''),
    scoreAmour: clampScore(parsed.scoreAmour),
    scoreTravail: clampScore(parsed.scoreTravail),
    scoreEnergie: clampScore(parsed.scoreEnergie),
    ...natalExtra,
    mode: 'ia',
  };
}

/** Thème astral complet — portrait de fond basé sur le signe solaire et les
 * informations de naissance du profil. Quand l'heure et le lieu de
 * naissance ont pu être résolus en coordonnées + fuseau horaire (voir
 * lib/profile.ts, lib/geocode.ts), un vrai thème natal est calculé
 * (ascendant, lune natale, aspects — lib/natal.ts) et fourni tel quel à
 * l'IA ; sinon on reste qualitatif, sans jamais inventer ces éléments. */
export async function generateAstralChart(opts: AstralOptions): Promise<AstralChart> {
  const langue = opts.langue ?? 'fr';
  const { naissance } = opts;
  const themeNatal =
    naissance.heure && naissance.latitude != null && naissance.longitude != null && naissance.timezone
      ? calculerThemeNatal(naissance.date, naissance.heure, naissance.timezone, naissance.latitude, naissance.longitude)
      : null;
  const natalExtra = themeNatal
    ? {
        ascendantSigne: { nom: themeNatal.ascendant.signe.nom, symbole: themeNatal.ascendant.signe.symbole },
        luneSigne: { nom: themeNatal.luneSigne.nom, symbole: themeNatal.luneSigne.symbole },
      }
    : {};

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const demo = fallbackAstralChart(opts.sign.key, opts.naissance.date + opts.naissance.lieu);
    return { ...demo, portrait: avecPrenom(opts.prenom, demo.portrait), ...natalExtra, mode: 'demo' };
  }
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
  const contexteNaissance =
    `Informations de naissance : date ${naissance.date}` +
    (naissance.heure ? `, heure ${naissance.heure}` : '') +
    (naissance.lieu ? `, lieu ${naissance.lieu}` : '') +
    `.`;
  const natalTxt = themeNatal
    ? `Thème natal réel, calculé (à utiliser factuellement, n'en invente aucun autre élément) : ascendant ${themeNatal.ascendant.signe.nom}, lune natale en ${themeNatal.luneSigne.nom}` +
      (themeNatal.aspects.length > 0
        ? `, aspects natals principaux : ${themeNatal.aspects.slice(0, 5).map((a) => `${a.corps1}-${a.corps2} (${a.aspect})`).join(', ')}`
        : '') +
      '.'
    : `Aucun thème natal précis disponible (heure ou lieu de naissance non résolus) — reste qualitatif, basé uniquement sur le signe solaire.`;
  const consigneNatal = themeNatal
    ? "Intègre l'ascendant et la lune natale ci-dessus dans le portrait (ce sont des éléments réels et calculés) — sans inventer de maison ou de transit non fournis."
    : 'Ne prétends jamais calculer une position astronomique précise (pas d\'ascendant, de lune ou de maison inventés — reste qualitatif, basé sur le signe solaire).';
  const prompt = `Tu écris le thème astral complet d'un utilisateur de l'application Horosphère, pour le signe solaire ${opts.sign.nom} (élément ${opts.sign.element}, planète maîtresse ${opts.sign.planete}).
${contexteNaissance}
${natalTxt}
${consigneNatal}
${DIRECTIVE_TON} Dense mais accessible, valorisant sans flatterie vide. Un portrait de fond sur la durée : chaque axe (forces, défis, amour, carrière, équilibre intérieur) doit éclairer une décision ou un ajustement possible.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :
{
  "portrait": "3 à 5 phrases de portrait de personnalité général, basé sur le signe",
  "forces": "1 à 2 phrases sur les forces principales, et comment s'en servir activement",
  "defis": "1 à 2 phrases sur le principal axe de progression, et un premier pas concret pour y travailler",
  "amour": "1 à 2 phrases sur la dynamique amoureuse de fond, se terminant par une implication concrète",
  "carriere": "1 à 2 phrases sur la dynamique professionnelle de fond, se terminant par une implication concrète",
  "spiritualite": "1 à 2 phrases sur l'équilibre intérieur, se terminant par une implication concrète",
  "scoreAmour": nombre entier entre 30 et 98,
  "scoreCarriere": nombre entier entre 30 et 98,
  "scoreSpiritualite": nombre entier entre 30 et 98,
  "conseilDeVie": "un conseil de fond, actionnable, valable sur la durée"
}${consigneLangue(langue)}`;
  const parsed = await callClaude(apiKey, model, prompt, 1200);
  return {
    portrait: avecPrenom(opts.prenom, String(parsed.portrait ?? '')),
    forces: String(parsed.forces ?? ''),
    defis: String(parsed.defis ?? ''),
    amour: String(parsed.amour ?? ''),
    carriere: String(parsed.carriere ?? ''),
    spiritualite: String(parsed.spiritualite ?? ''),
    scoreAmour: clampScore(parsed.scoreAmour),
    scoreCarriere: clampScore(parsed.scoreCarriere),
    scoreSpiritualite: clampScore(parsed.scoreSpiritualite),
    conseilDeVie: String(parsed.conseilDeVie ?? ''),
    ...natalExtra,
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
  // Présents uniquement quand l'heure et le lieu de naissance ont pu être
  // résolus en thème natal réel (voir lib/natal.ts) — jamais approximés.
  ascendantSigne?: { nom: string; symbole: string };
  luneSigne?: { nom: string; symbole: string };
  mode: 'ia' | 'demo';
};

/** Analyse sentimentale hebdomadaire — portée d'une semaine (pas du jour),
 * régénérée de façon stable pour la semaine ISO en cours. Le thème natal
 * réel (ascendant, lune), quand il est disponible, vient nuancer le ton sans
 * jamais être inventé — même logique que generateAstralChart. */
export async function generateSentiment(opts: {
  sign: Sign;
  weekKey: string;
  naissance?: { date: string; heure?: string; lieu?: string; latitude?: number | null; longitude?: number | null; timezone?: string | null };
  langue?: Langue;
  prenom?: string;
}): Promise<SentimentReading> {
  const langue = opts.langue ?? 'fr';
  const { naissance } = opts;
  const themeNatal =
    naissance?.heure && naissance.latitude != null && naissance.longitude != null && naissance.timezone
      ? calculerThemeNatal(naissance.date, naissance.heure, naissance.timezone, naissance.latitude, naissance.longitude)
      : null;
  const natalExtra = themeNatal
    ? {
        ascendantSigne: { nom: themeNatal.ascendant.signe.nom, symbole: themeNatal.ascendant.signe.symbole },
        luneSigne: { nom: themeNatal.luneSigne.nom, symbole: themeNatal.luneSigne.symbole },
      }
    : {};

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const demo = fallbackSentiment(opts.sign.key, opts.weekKey);
    return { ...demo, dominante: avecPrenom(opts.prenom, demo.dominante), ...natalExtra, mode: 'demo' };
  }
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
  const natalTxt = themeNatal
    ? ` Thème natal réel, calculé (à utiliser factuellement, n'en invente aucun autre élément) : ascendant ${themeNatal.ascendant.signe.nom}, lune natale en ${themeNatal.luneSigne.nom} — tu peux t'appuyer dessus, notamment pour la dimension émotionnelle (la lune natale).`
    : '';
  const prompt = `Tu écris une analyse sentimentale hebdomadaire pour l'application Horosphère, pour le signe ${opts.sign.nom} (élément ${opts.sign.element}). Portée : la semaine en cours (semaine ${opts.weekKey}), pas la journée.${natalTxt}
${DIRECTIVE_TON} Introspectif, une seule idée par phrase.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :
{
  "titre": "titre court de 3 à 6 mots pour cette semaine",
  "dominante": "1 à 2 phrases sur l'émotion ou le besoin dominant de la semaine, se terminant par ce que ça implique concrètement",
  "enJeu": "1 à 2 phrases sur ce qui se joue ou se transforme intérieurement, se terminant par ce que ça implique concrètement",
  "relations": "1 à 2 phrases sur l'impact dans les relations proches, se terminant par ce que ça implique concrètement",
  "conseil": "une phrase impérative courte, l'action principale à mener cette semaine",
  "scoreClarte": nombre entier entre 30 et 98,
  "scoreIntensite": nombre entier entre 20 et 95,
  "motCle": "un seul mot résumant la semaine (${motLangue(langue)})"
}${consigneLangue(langue)}`;
  const parsed = await callClaude(apiKey, model, prompt, 500);
  return {
    titre: String(parsed.titre ?? ''),
    dominante: avecPrenom(opts.prenom, String(parsed.dominante ?? '')),
    enJeu: String(parsed.enJeu ?? ''),
    relations: String(parsed.relations ?? ''),
    conseil: String(parsed.conseil ?? ''),
    scoreClarte: clampScore(parsed.scoreClarte),
    scoreIntensite: clampScore(parsed.scoreIntensite),
    motCle: String(parsed.motCle ?? 'Clarté'),
    ...natalExtra,
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
  // Ascendant/lune natale de l'utilisateur uniquement (jamais de la seconde
  // personne, dont on ne connaît que la date de naissance, pas l'heure ni le
  // lieu) — présents uniquement quand ils ont pu être résolus (lib/natal.ts).
  ascendantSigne?: { nom: string; symbole: string };
  luneSigne?: { nom: string; symbole: string };
  mode: 'ia' | 'demo';
};

/** Compatibilité amoureuse entre l'utilisateur et une seconde personne
 * choisie librement — la seule lecture qui compare à un profil qui n'est
 * pas le sien. Affinée avec le prénom et la date de naissance exacte des
 * deux personnes (décan, en plus du seul signe solaire). Le thème natal réel
 * (ascendant, lune) n'est calculé et utilisé que pour l'utilisateur — la
 * seconde personne n'a jamais fourni d'heure ni de lieu de naissance, donc
 * jamais de positions astronomiques inventées pour elle. */
export async function generateCompatibility(opts: {
  prenom: string;
  sign: Sign;
  dateNaissance: string;
  naissance?: { date: string; heure?: string; lieu?: string; latitude?: number | null; longitude?: number | null; timezone?: string | null };
  autrePrenom: string;
  autreSign: Sign;
  autreDateNaissance: string;
  seedKey: string;
  langue?: Langue;
}): Promise<CompatibilityReading> {
  const langue = opts.langue ?? 'fr';
  const [, m1, d1] = opts.dateNaissance.split('-').map(Number);
  const [, m2, d2] = opts.autreDateNaissance.split('-').map(Number);
  const decan1 = decanOf(opts.sign, m1, d1);
  const decan2 = decanOf(opts.autreSign, m2, d2);

  const { naissance } = opts;
  const themeNatal =
    naissance?.heure && naissance.latitude != null && naissance.longitude != null && naissance.timezone
      ? calculerThemeNatal(naissance.date, naissance.heure, naissance.timezone, naissance.latitude, naissance.longitude)
      : null;
  const natalExtra = themeNatal
    ? {
        ascendantSigne: { nom: themeNatal.ascendant.signe.nom, symbole: themeNatal.ascendant.signe.symbole },
        luneSigne: { nom: themeNatal.luneSigne.nom, symbole: themeNatal.luneSigne.symbole },
      }
    : {};

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
      ...natalExtra,
      mode: 'demo',
    };
  }
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
  const natalTxt = themeNatal
    ? ` Thème natal réel de ${opts.prenom}, calculé (à utiliser factuellement) : ascendant ${themeNatal.ascendant.signe.nom}, lune natale en ${themeNatal.luneSigne.nom} — tu peux t'en servir pour nuancer la dynamique du duo, mais uniquement du côté de ${opts.prenom} (aucune position astronomique connue pour ${opts.autrePrenom}, dont on n'a que la date de naissance).`
    : '';
  const prompt = `Tu écris une analyse de compatibilité amoureuse pour l'application Horosphère, entre deux personnes :
- ${opts.prenom}, signe ${opts.sign.nom} (élément ${opts.sign.element}), ${decan1}e décan (né(e) le ${opts.dateNaissance})
- ${opts.autrePrenom}, signe ${opts.autreSign.nom} (élément ${opts.autreSign.element}), ${decan2}e décan (né(e) le ${opts.autreDateNaissance})
Utilise les deux prénoms directement dans le texte plutôt que de dire "l'un" et "l'autre". Le décan (tiers du signe selon la date exacte de naissance) doit nuancer l'analyse sans jamais prétendre calculer une position astronomique précise pour ${opts.autrePrenom} (pas d'ascendant, de maison ou de transit inventés pour cette personne).${natalTxt}
${DIRECTIVE_TON} Nuancé, jamais binaire ("ça marche" / "ça marche pas"), valorise les deux personnes.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :
{
  "scoreGlobal": nombre entier entre 35 et 98,
  "resume": "1 à 2 phrases de résumé de cette entente",
  "pointsForts": "1 à 2 phrases sur les points forts du duo, et comment s'en servir activement",
  "pointsFriction": "1 à 2 phrases sur le principal point de friction, formulé avec bienveillance, et un premier geste pour le désamorcer",
  "amour": "1 à 2 phrases sur la dynamique amoureuse spécifique, se terminant par une implication concrète",
  "communication": "1 à 2 phrases sur la façon dont ce duo communique le mieux, formulé comme une pratique à adopter",
  "conseil": "l'action concrète principale pour faire durer cette relation"
}${consigneLangue(langue)}`;
  const parsed = await callClaude(apiKey, model, prompt, 700);
  return {
    scoreGlobal: clampScore(parsed.scoreGlobal),
    resume: String(parsed.resume ?? ''),
    pointsForts: String(parsed.pointsForts ?? ''),
    pointsFriction: String(parsed.pointsFriction ?? ''),
    amour: String(parsed.amour ?? ''),
    communication: String(parsed.communication ?? ''),
    conseil: String(parsed.conseil ?? ''),
    ...natalExtra,
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
  // Présents uniquement quand l'heure et le lieu de naissance ont pu être
  // résolus en thème natal réel (voir lib/natal.ts) — jamais approximés.
  ascendantSigne?: { nom: string; symbole: string };
  luneSigne?: { nom: string; symbole: string };
  mode: 'ia' | 'demo';
};

/** Grande analyse personnalisée — le bilan le plus complet, tous les axes
 * de vie (contrairement au thème astral, qui reste un portrait de fond, ou
 * à l'horoscope, limité au jour). Basée sur le profil de naissance, et sur
 * le thème natal réel (ascendant, lune, aspects) quand il est disponible —
 * même logique que generateAstralChart. */
export async function generateGrandeAnalyse(opts: {
  sign: Sign;
  naissance: { date: string; heure?: string; lieu?: string; latitude?: number | null; longitude?: number | null; timezone?: string | null };
  langue?: Langue;
  prenom?: string;
}): Promise<GrandeAnalyse> {
  const langue = opts.langue ?? 'fr';
  const { naissance } = opts;
  const themeNatal =
    naissance.heure && naissance.latitude != null && naissance.longitude != null && naissance.timezone
      ? calculerThemeNatal(naissance.date, naissance.heure, naissance.timezone, naissance.latitude, naissance.longitude)
      : null;
  const natalExtra = themeNatal
    ? {
        ascendantSigne: { nom: themeNatal.ascendant.signe.nom, symbole: themeNatal.ascendant.signe.symbole },
        luneSigne: { nom: themeNatal.luneSigne.nom, symbole: themeNatal.luneSigne.symbole },
      }
    : {};

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const demo = fallbackGrandeAnalyse(opts.sign.key, opts.naissance.date + opts.naissance.lieu);
    return { ...demo, synthese: avecPrenom(opts.prenom, demo.synthese), ...natalExtra, mode: 'demo' };
  }
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
  const contexteNaissance =
    `Informations de naissance : date ${naissance.date}` +
    (naissance.heure ? `, heure ${naissance.heure}` : '') +
    (naissance.lieu ? `, lieu ${naissance.lieu}` : '') +
    `.`;
  const natalTxt = themeNatal
    ? `Thème natal réel, calculé (à utiliser factuellement, n'en invente aucun autre élément) : ascendant ${themeNatal.ascendant.signe.nom}, lune natale en ${themeNatal.luneSigne.nom}` +
      (themeNatal.aspects.length > 0
        ? `, aspects natals principaux : ${themeNatal.aspects.slice(0, 5).map((a) => `${a.corps1}-${a.corps2} (${a.aspect})`).join(', ')}`
        : '') +
      '.'
    : `Aucun thème natal précis disponible (heure ou lieu de naissance non résolus) — reste qualitatif, basé uniquement sur le signe solaire.`;
  const consigneNatal = themeNatal
    ? "Intègre l'ascendant et la lune natale ci-dessus (éléments réels et calculés) dans l'analyse, sans inventer de maison ou de transit non fournis."
    : 'Ne prétends jamais calculer une position astronomique précise (pas d\'ascendant, de maison ou de transit inventés) — reste qualitatif, basé sur le signe solaire et les informations fournies.';
  const prompt = `Tu écris une grande analyse personnalisée pour l'application Horosphère, pour le signe ${opts.sign.nom} (élément ${opts.sign.element}, planète maîtresse ${opts.sign.planete}). ${contexteNaissance}
${natalTxt}
C'est le bilan le plus complet proposé par l'application : il couvre tous les grands axes de vie (amour, carrière, finances, santé, famille, évolution personnelle). ${consigneNatal}
${DIRECTIVE_TON} Dense, structuré, valorisant sans flatterie vide.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :
{
  "synthese": "3 à 4 phrases de synthèse générale de la période",
  "amour": "1 à 2 phrases sur l'axe amoureux, se terminant par une implication concrète",
  "carriere": "1 à 2 phrases sur l'axe carrière, se terminant par une implication concrète",
  "finances": "1 à 2 phrases sur l'axe financier, se terminant par une implication concrète",
  "sante": "1 à 2 phrases sur l'axe santé/énergie, se terminant par une implication concrète",
  "famille": "1 à 2 phrases sur l'axe famille/entourage, se terminant par une implication concrète",
  "evolutionPersonnelle": "1 à 2 phrases sur l'évolution personnelle, se terminant par un premier pas concret",
  "scoreAmour": nombre entier entre 30 et 98,
  "scoreCarriere": nombre entier entre 30 et 98,
  "scoreSante": nombre entier entre 30 et 98,
  "scoreFinances": nombre entier entre 30 et 98,
  "conseilPrincipal": "l'action centrale de cette analyse, formulée en 1 phrase impérative",
  "periodeCle": "une expression courte de période, ex: 'les quatre prochaines semaines'"
}${consigneLangue(langue)}`;
  const parsed = await callClaude(apiKey, model, prompt, 1400);
  return {
    synthese: avecPrenom(opts.prenom, String(parsed.synthese ?? '')),
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
    ...natalExtra,
    mode: 'ia',
  };
}

export type ThematicReading = {
  titre: string;
  texte: string;
  pointAttention: string;
  conseil: string;
  score: number;
  // Présents uniquement quand l'heure et le lieu de naissance ont pu être
  // résolus en thème natal réel (voir lib/natal.ts) — jamais approximés.
  ascendantSigne?: { nom: string; symbole: string };
  luneSigne?: { nom: string; symbole: string };
  mode: 'ia' | 'demo';
};

/** Les 6 lectures thématiques "simples" (voir lib/themes.ts) partagent un
 * seul générateur, paramétré par thème, plutôt que 6 fonctions quasi
 * identiques. Le thème natal réel (ascendant, lune), quand disponible, vient
 * nuancer factuellement le texte — même logique que generateAstralChart. */
export async function generateThematic(opts: {
  theme: ThemeKey;
  sign: Sign;
  seedKey: string;
  naissance?: { date: string; heure?: string; lieu?: string; latitude?: number | null; longitude?: number | null; timezone?: string | null };
  langue?: Langue;
  prenom?: string;
}): Promise<ThematicReading> {
  const langue = opts.langue ?? 'fr';
  const meta = THEMES[opts.theme];
  const { naissance } = opts;
  const themeNatal =
    naissance?.heure && naissance.latitude != null && naissance.longitude != null && naissance.timezone
      ? calculerThemeNatal(naissance.date, naissance.heure, naissance.timezone, naissance.latitude, naissance.longitude)
      : null;
  const natalExtra = themeNatal
    ? {
        ascendantSigne: { nom: themeNatal.ascendant.signe.nom, symbole: themeNatal.ascendant.signe.symbole },
        luneSigne: { nom: themeNatal.luneSigne.nom, symbole: themeNatal.luneSigne.symbole },
      }
    : {};

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const demo = fallbackThematic(opts.theme, opts.sign.key, opts.seedKey);
    return { titre: meta.titreCard, ...demo, texte: avecPrenom(opts.prenom, demo.texte), ...natalExtra, mode: 'demo' };
  }
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
  const natalTxt = themeNatal
    ? ` Thème natal réel, calculé (à utiliser factuellement, n'en invente aucun autre élément) : ascendant ${themeNatal.ascendant.signe.nom}, lune natale en ${themeNatal.luneSigne.nom} — tu peux t'en servir s'il éclaire cet axe précis.`
    : '';
  const prompt = `Tu écris une lecture astrologique thématique pour l'application Horosphère, pour le signe ${opts.sign.nom} (élément ${opts.sign.element}, planète maîtresse ${opts.sign.planete}). Thème : ${meta.axe}. Portée : ${meta.portee}.
${meta.consigne}${natalTxt}
${DIRECTIVE_TON}
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :
{
  "titre": "titre court de 3 à 7 mots",
  "texte": "2 à 4 phrases sur cet axe précis, se terminant par une implication concrète",
  "pointAttention": "1 phrase sur un point à surveiller, formulée comme un ajustement à faire plutôt qu'une simple mise en garde",
  "conseil": "une phrase impérative courte, l'action principale à mener",
  "score": nombre entier entre 30 et 98
}${consigneLangue(langue)}`;
  const parsed = await callClaude(apiKey, model, prompt, 500);
  return {
    titre: String(parsed.titre ?? meta.titreCard),
    texte: avecPrenom(opts.prenom, String(parsed.texte ?? '')),
    pointAttention: String(parsed.pointAttention ?? ''),
    conseil: String(parsed.conseil ?? ''),
    score: clampScore(parsed.score),
    ...natalExtra,
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
  // Présents uniquement quand l'heure et le lieu de naissance ont pu être
  // résolus en thème natal réel (voir lib/natal.ts) — jamais approximés.
  ascendantSigne?: { nom: string; symbole: string };
  luneSigne?: { nom: string; symbole: string };
  mode: 'ia' | 'demo';
};

/** Lecture calée sur la phase lunaire réelle du jour (même calcul que la
 * section "Lune du jour" de la page d'accueil), interprétée pour le signe
 * de l'utilisateur — et, quand disponible, pour sa lune natale réelle
 * (ligne du dialogue entre la lune du ciel et la lune de naissance).
 * `phase` (0-1) est conservée pour pouvoir redessiner la même silhouette de
 * lune dans l'historique, plutôt que la phase du jour. */
export async function generateLunarCycle(opts: {
  sign: Sign;
  naissance?: { date: string; heure?: string; lieu?: string; latitude?: number | null; longitude?: number | null; timezone?: string | null };
  langue?: Langue;
  // Date ciblée par la lecture (YYYY-MM-DD). Par défaut la date du jour —
  // à préciser explicitement pour une génération anticipée (ex. contenu
  // préparé la veille pour le lendemain), afin que la phase lunaire décrite
  // soit bien celle de la date visée, pas celle de l'instant de génération.
  dateISO?: string;
  prenom?: string;
}): Promise<LunarCycleReading> {
  const langue = opts.langue ?? 'fr';
  const dateCible = opts.dateISO ? new Date(opts.dateISO) : new Date();
  const moon = moonPhaseInfo(Number.isNaN(dateCible.getTime()) ? new Date() : dateCible, langue);
  const { naissance } = opts;
  const themeNatal =
    naissance?.heure && naissance.latitude != null && naissance.longitude != null && naissance.timezone
      ? calculerThemeNatal(naissance.date, naissance.heure, naissance.timezone, naissance.latitude, naissance.longitude)
      : null;
  const natalExtra = themeNatal
    ? {
        ascendantSigne: { nom: themeNatal.ascendant.signe.nom, symbole: themeNatal.ascendant.signe.symbole },
        luneSigne: { nom: themeNatal.luneSigne.nom, symbole: themeNatal.luneSigne.symbole },
      }
    : {};

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const demo = fallbackLunarCycle(opts.sign.key, moon.label);
    return { titre: 'Cycle lunaire', ...demo, interpretation: avecPrenom(opts.prenom, demo.interpretation), phase: moon.phase, phaseLabel: moon.label, illumination: moon.illumination, ...natalExtra, mode: 'demo' };
  }
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
  const natalTxt = themeNatal
    ? ` Lune natale réelle de l'utilisateur, calculée (à utiliser factuellement) : ${themeNatal.luneSigne.nom}. Tu peux mettre en dialogue la phase lunaire du jour et cette lune natale.`
    : '';
  const prompt = `Tu écris une lecture "cycle lunaire" pour l'application Horosphère, pour le signe ${opts.sign.nom} (élément ${opts.sign.element}).
Phase lunaire réelle du jour : ${moon.label}, illuminée à ${moon.illumination}%. N'invente pas d'autre phase que celle-ci.${natalTxt}
${DIRECTIVE_TON} Contemplatif sur la lecture, mais toujours concret sur l'implication.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :
{
  "titre": "titre court de 3 à 6 mots",
  "interpretation": "2 à 3 phrases reliant cette phase lunaire réelle au signe de l'utilisateur, se terminant par une implication concrète",
  "conseil": "une phrase impérative courte, l'action à mener en lien avec cette phase"
}${consigneLangue(langue)}`;
  const parsed = await callClaude(apiKey, model, prompt, 400);
  return {
    titre: String(parsed.titre ?? 'Cycle lunaire'),
    interpretation: avecPrenom(opts.prenom, String(parsed.interpretation ?? '')),
    conseil: String(parsed.conseil ?? ''),
    phase: moon.phase,
    phaseLabel: moon.label,
    illumination: moon.illumination,
    ...natalExtra,
    mode: 'ia',
  };
}

export type TransitsReading = {
  titre: string;
  interpretation: string;
  conseil: string;
  planetesEnFocus: { nom: string; glyphe: string; signe: string }[];
  // Présents uniquement quand l'heure et le lieu de naissance ont pu être
  // résolus en thème natal réel (voir lib/natal.ts) — jamais approximés.
  ascendantSigne?: { nom: string; symbole: string };
  luneSigne?: { nom: string; symbole: string };
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
 * Soleil, la Lune, et la planète maîtresse du signe de l'utilisateur — mise
 * en regard, quand disponible, de l'ascendant et la lune natale réels
 * (transit du jour vs thème de naissance). */
export async function generateTransits(opts: {
  sign: Sign;
  naissance?: { date: string; heure?: string; lieu?: string; latitude?: number | null; longitude?: number | null; timezone?: string | null };
  langue?: Langue;
  // Date ciblée par la lecture (YYYY-MM-DD). Par défaut la date du jour —
  // à préciser explicitement pour une génération anticipée (ex. contenu
  // préparé la veille pour le lendemain), afin que les positions
  // planétaires décrites soient bien celles de la date visée, pas celles
  // de l'instant de génération.
  dateISO?: string;
  prenom?: string;
}): Promise<TransitsReading> {
  const langue = opts.langue ?? 'fr';
  const dateCible = opts.dateISO ? new Date(opts.dateISO) : new Date();
  const positions = currentPlanetPositions(Number.isNaN(dateCible.getTime()) ? new Date() : dateCible);
  const byKey = new Map(positions.map((p) => [p.key, p]));
  const rulerKey = RULER_TO_PLANET_KEY[opts.sign.planete];
  const focusKeys = Array.from(new Set(['soleil', 'lune', rulerKey && byKey.has(rulerKey) ? rulerKey : 'mercure']));
  const planetesEnFocus = focusKeys
    .map((key) => byKey.get(key))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({ nom: p.nom, glyphe: p.glyphe, signe: zodiacSignAt(p.longitude).nom }));

  const contexte = planetesEnFocus.map((p) => `${p.nom} est actuellement en ${p.signe}`).join(', ') + '.';

  const { naissance } = opts;
  const themeNatal =
    naissance?.heure && naissance.latitude != null && naissance.longitude != null && naissance.timezone
      ? calculerThemeNatal(naissance.date, naissance.heure, naissance.timezone, naissance.latitude, naissance.longitude)
      : null;
  const natalExtra = themeNatal
    ? {
        ascendantSigne: { nom: themeNatal.ascendant.signe.nom, symbole: themeNatal.ascendant.signe.symbole },
        luneSigne: { nom: themeNatal.luneSigne.nom, symbole: themeNatal.luneSigne.symbole },
      }
    : {};

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const demo = fallbackTransits(opts.sign.key, contexte);
    return { titre: 'Transits planétaires', ...demo, interpretation: avecPrenom(opts.prenom, demo.interpretation), planetesEnFocus, ...natalExtra, mode: 'demo' };
  }
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
  const natalTxt = themeNatal
    ? ` Thème natal réel de l'utilisateur, calculé (à utiliser factuellement) : ascendant ${themeNatal.ascendant.signe.nom}, lune natale en ${themeNatal.luneSigne.nom}. Tu peux relier les transits du jour à ce thème de naissance.`
    : '';
  const prompt = `Tu écris une lecture "transits planétaires" pour l'application Horosphère, pour le signe ${opts.sign.nom} (élément ${opts.sign.element}, planète maîtresse ${opts.sign.planete}).
Position réelle actuelle des planètes : ${contexte} N'invente aucune autre position planétaire que celles données.${natalTxt}
${DIRECTIVE_TON} Évite le jargon technique (pas d'aspects en degrés).
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :
{
  "titre": "titre court de 3 à 6 mots",
  "interpretation": "2 à 3 phrases reliant ces positions réelles au signe de l'utilisateur, se terminant par une implication concrète",
  "conseil": "une phrase impérative courte, l'action à mener"
}${consigneLangue(langue)}`;
  const parsed = await callClaude(apiKey, model, prompt, 450);
  return {
    titre: String(parsed.titre ?? 'Transits planétaires'),
    interpretation: avecPrenom(opts.prenom, String(parsed.interpretation ?? '')),
    conseil: String(parsed.conseil ?? ''),
    planetesEnFocus,
    ...natalExtra,
    mode: 'ia',
  };
}
