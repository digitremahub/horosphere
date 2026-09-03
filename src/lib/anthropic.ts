import { Sign } from './zodiac';
import { fallbackHoroscope, fallbackAstralChart } from './fallback-generator';

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
async function callClaude(apiKey: string, model: string, prompt: string, maxTokens: number): Promise<any> {
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
