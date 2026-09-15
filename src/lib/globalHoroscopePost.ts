// Post "Horoscope global" — demande explicite de l'utilisateur (15/09) :
// "un horoscope global, qui parle à tous, chaque jour à 00h, qui se publie
// automatiquement avec un seul visuel, pas de carrousel." Contrairement à
// TOUS les autres formats de ce pipeline, celui-ci n'a AUCUNE étape
// manuelle (pas de préparation Canva, pas de validation Statut avant
// publication) : le scénario Make qui l'exécute génère ET publie dans la
// même passe, à 00h précises.
//
// C'est justement pour ça que le visuel n'est PAS un design Canva (aucun
// humain n'est disponible à minuit pour le préparer) : une vraie photo déjà
// présente sur le site, en rotation (visuelInstagramDuJour, lib/social.ts)
// — jamais une image composée en code (next/og), cohérent avec la décision
// du 15/09 d'éliminer tout rendu de visuel en code. Contenu générique
// (aucune personnalisation par signe), basé sur la phase lunaire réelle et
// le prochain événement du ciel — même principe que l'ancien contenu
// marketing Facebook/TikTok (voir genererFacebookTiktok dans social.ts),
// mais un module dédié : ce post a sa propre publication autonome à 00h,
// indépendante du cycle brouillon → approbation du reste du pipeline.

import { moonPhaseInfo } from '../components/MoonPhase';
import { getUpcomingSkyEvents } from './skyEvents';
import { callClaude } from './anthropic';
import { visuelInstagramDuJour } from './social';
import { mulberry32, hashStr, pick } from './fallback-generator';

export type HoroscopeGlobalPost = {
  dateISO: string;
  legende: string;
  hashtags: string;
  imageUrl: string;
  mode: 'ia' | 'demo';
};

const HASHTAGS_GLOBAL = '#horoscope #astrologie #horosphere #developpementpersonnel #signeastrologique';

function prochainEvenementLabel(dateISO: string): string {
  const events = getUpcomingSkyEvents(new Date(dateISO));
  const next = events[0];
  if (!next) return '';
  const dateLabel = new Date(next.dateISO).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  return `${next.label.toLowerCase()} le ${dateLabel}`;
}

const LEGENDES_DEMO = [
  "Aujourd'hui, la lune est en {phase}. {influence}\n\nChaque signe vit ça différemment — découvre ta lecture personnalisée, basée sur ta date, ton heure et ton lieu de naissance, sur horosphere.fr.",
  "{phase} ce {jour} — {influence}\n\nUne lecture par jour, une action à mener : c'est ce qu'Horosphère t'offre, ajusté à ton thème natal réel.",
  "Ce {jour}, le ciel est en {phase}. {influence}\n\nTon signe ne vit pas ce moment comme les autres — ta lecture complète t'attend sur horosphere.fr.",
];

function interpole(texte: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, v), texte);
}

async function genererLegendeIA(dateISO: string, apiKey: string, moon: ReturnType<typeof moonPhaseInfo>, evenement: string): Promise<string | null> {
  try {
    const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
    const prompt = `Tu es le community manager d'Horosphère, une application française de développement personnel par les astres. Écris la légende d'un post Instagram/Facebook quotidien, public (pas adressé à un signe précis), en français.

Contexte réel du jour (${dateISO}) : phase lunaire = ${moon.label} (${moon.illumination}% d'illumination). ${evenement ? `Prochain événement du ciel : ${evenement}.` : ''}

Ton direct, chaleureux, jamais fataliste ni anxiogène. 2 à 4 phrases, peu d'emojis. Mentionne que chaque signe vit ce moment différemment, et invite à découvrir sa lecture personnalisée (thème natal réel : date, heure, lieu de naissance) sur horosphere.fr. Varie la structure d'un jour à l'autre : pas systématiquement "la lune est en [phase]" en première phrase.

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour : {"legende": "..."}`;
    const parsed = await callClaude(apiKey, model, prompt, 500);
    const legende = String(parsed?.legende ?? '').trim();
    return legende || null;
  } catch (err) {
    console.error('globalHoroscopePost: appel IA échoué, repli démo', err);
    return null;
  }
}

/** Construit le post "Horoscope global" du jour — texte générique (aucune
 * personnalisation par signe) + une vraie photo du site en rotation. Publié
 * automatiquement à 00h par Make, sans étape de validation manuelle : le
 * repli déterministe est donc particulièrement important ici (jamais de
 * blocage possible en pleine nuit). */
export async function genererHoroscopeGlobal(date: Date = new Date()): Promise<HoroscopeGlobalPost> {
  const dateISO = date.toISOString().slice(0, 10);
  const moon = moonPhaseInfo(date);
  const evenement = prochainEvenementLabel(dateISO);
  const imageUrl = visuelInstagramDuJour(dateISO);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const legendeIA = apiKey ? await genererLegendeIA(dateISO, apiKey, moon, evenement) : null;

  if (legendeIA) {
    return { dateISO, legende: legendeIA, hashtags: HASHTAGS_GLOBAL, imageUrl, mode: 'ia' };
  }

  const jour = date.toLocaleDateString('fr-FR', { weekday: 'long' });
  const rng = mulberry32(hashStr('horoscope-global::' + dateISO));
  const legende = interpole(pick(rng, LEGENDES_DEMO), { phase: moon.label.toLowerCase(), influence: moon.influence, jour });
  return { dateISO, legende, hashtags: HASHTAGS_GLOBAL, imageUrl, mode: 'demo' };
}
