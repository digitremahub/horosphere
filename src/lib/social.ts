// Génération du contenu marketing quotidien pour les réseaux sociaux
// (Instagram, Facebook, TikTok) — la partie "équipe IA de création" du
// pipeline de promotion. Réutilise les vraies données de l'application
// (phase lunaire réelle, prochains événements du ciel) plutôt que d'inventer
// du contenu générique. Ne publie jamais rien elle-même : voir
// src/app/api/social/* pour le cycle brouillon -> approuvé -> publié.

import { moonPhaseInfo } from '../components/MoonPhase';
import { getUpcomingSkyEvents } from './skyEvents';
import { callClaude } from './anthropic';
import { genererIllustrationSociale } from './openaiImage';
import { mulberry32, hashStr, pick } from './fallback-generator';

export type SocialDraft = {
  legende: string;
  hashtags: string;
  imageUrl: string | null;
  scriptVideo: string | null;
  mode: 'ia' | 'demo';
};

export type DailySocialContent = {
  instagram: SocialDraft;
  facebook: SocialDraft;
  tiktok: SocialDraft;
};

/** URL absolue du site — utilisée pour que les visuels suggérés soient
 * directement exploitables par Make.com (modules Facebook/Instagram) sans
 * upload manuel. À renseigner via NEXT_PUBLIC_SITE_URL si un domaine
 * personnalisé est attaché au projet Vercel. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://horosphere-live.vercel.app').replace(/\/$/, '');
}

// Visuels déjà présents sur le site, mis en rotation quotidienne plutôt que
// de générer une image à chaque fois (aucun outil de génération d'image
// dans ce pipeline) — cohérent avec l'identité visuelle existante.
// Facebook accepte le PNG sans problème (Graph API), donc ces cinq visuels
// (dont bg-tarifs.png, au ratio 2.25:1) restent utilisables tels quels.
const VISUELS = [
  '/images/hero-accueil.png',
  '/images/bg-theme-astral.png',
  '/images/bg-tarifs.png',
  '/images/bg-resultat-lecture.png',
  '/images/bg-connexion.png',
];

// Instagram (Content Publishing API) impose du JPEG strict et un ratio
// entre 4:5 et 1.91:1 — bg-tarifs.png (2.25:1) est hors gabarit, et le PNG
// est refusé quel que soit le ratio. Copies JPEG dédiées dans
// public/images/social/, mêmes visuels que ceux utilisés pour Facebook
// (sauf bg-tarifs.png, exclu) pour garder une identité visuelle cohérente.
const VISUELS_INSTAGRAM = [
  '/images/social/hero-accueil.jpg',
  '/images/social/bg-theme-astral.jpg',
  '/images/social/bg-resultat-lecture.jpg',
  '/images/social/bg-connexion.jpg',
];

export function visuelDuJour(dateISO: string): string {
  const rng = mulberry32(hashStr('visuel::' + dateISO));
  return siteUrl() + pick(rng, VISUELS);
}

export function visuelInstagramDuJour(dateISO: string): string {
  const rng = mulberry32(hashStr('visuel-ig::' + dateISO));
  return siteUrl() + pick(rng, VISUELS_INSTAGRAM);
}

// Illustrations dédiées à la page Actualités (fournies par le community
// manager) — distinctes des visuels des réseaux sociaux ci-dessus, pour ne
// pas mélanger l'identité des deux usages. Utilisée par lib/skyNews.ts.
// Purement décoratives : aucune ne prétend représenter un fait daté.
const VISUELS_ACTUALITES = [
  '/images/actualites/carte-du-ciel.webp',
  '/images/actualites/sphere-armillaire.webp',
  '/images/actualites/eclipse.webp',
];

// Repère spécial : contrairement aux visuels ci-dessus, "l'alignement des
// planètes" prétend représenter un fait réel — il ne peut donc pas être une
// image statique recyclée chaque semaine. Rendu à la demande par
// /api/og/astrolabe à partir des vraies positions écliptiques du jour
// (astronomy-engine), jamais un fichier fixe.
const ASTROLABE_DYNAMIQUE = '__astrolabe__';

export function visuelActuDuJour(dateISO: string): string {
  const rng = mulberry32(hashStr('visuel-actu::' + dateISO));
  const choix = pick(rng, [...VISUELS_ACTUALITES, ASTROLABE_DYNAMIQUE]);
  if (choix === ASTROLABE_DYNAMIQUE) {
    return `${siteUrl()}/api/og/astrolabe?date=${dateISO}`;
  }
  return siteUrl() + choix;
}

function nextEventLabel(dateISO: string): string {
  const events = getUpcomingSkyEvents(new Date(dateISO));
  const next = events[0];
  if (!next) return '';
  const d = new Date(next.dateISO);
  const dateLabel = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  return `${next.label.toLowerCase()} le ${dateLabel}`;
}

// ===== Illustration IA (GPT / gpt-image-1) =====

// Quatre déclinaisons des motifs visuels déjà établis sur le site (astrolabe,
// carte du ciel, sextant, silhouette contemplative) — la variété quotidienne
// vient de la phase lunaire réelle du jour, jamais d'un motif inventé au hasard.
const SCENES_ILLUSTRATION = [
  "un astrolabe en cuivre posé sur un balcon donnant sur la mer au crépuscule, sous une lune en {phase} entourée d'étoiles",
  'une carte du ciel ancienne dépliée à la lumière d\'une bougie, une lune en {phase} visible par une fenêtre en arrière-plan',
  'un sextant tenu face au couchant, une sphère armillaire dorée au premier plan, un ciel nocturne où domine une lune en {phase}',
  'une silhouette contemplant un ciel étoilé à travers un astrolabe, une lune en {phase} bien visible, ambiance calme et méditative',
];

function sujetIllustrationDuJour(dateISO: string): string {
  const moon = moonPhaseInfo(new Date(dateISO));
  const rng = mulberry32(hashStr('illustration::' + dateISO));
  const scene = interpole(pick(rng, SCENES_ILLUSTRATION), { phase: moon.label.toLowerCase() });
  const evenement = nextEventLabel(dateISO);
  return evenement ? `${scene}. Au loin, une suggestion discrète de ${evenement} qui approche.` : scene;
}

/** Résout les visuels du jour pour Facebook et Instagram : tente une
 * illustration IA fraîche (gpt-image-1, partagée entre les deux plateformes
 * puisqu'elles acceptent toutes les deux du JPEG 1536x1024), et retombe sur
 * la rotation de visuels statiques du site en cas d'échec ou d'absence de
 * clé OPENAI_API_KEY — jamais de blocage du pipeline de publication. */
async function imagesDuJour(dateISO: string): Promise<{ facebook: string; instagram: string }> {
  try {
    const url = await genererIllustrationSociale(sujetIllustrationDuJour(dateISO), dateISO);
    if (url) return { facebook: url, instagram: url };
  } catch (err) {
    console.error('genererIllustrationSociale a échoué, retombe sur les visuels statiques', err);
  }
  return { facebook: visuelDuJour(dateISO), instagram: visuelInstagramDuJour(dateISO) };
}

// ===== Mode démo (sans clé Anthropic) =====

const IG_LEGENDES = [
  "✨ {phase} ce soir. {influence}\n\nDécouvrez ce qu'elle révèle pour votre signe sur Horosphère.",
  "🌙 Aujourd'hui : {phase}.\n{influence}\n\nVotre lecture du jour vous attend sur Horosphère.",
  "Le ciel de ce {jour} : {phase}. {influence}\n\nUn rituel doux, deux minutes par jour — sur Horosphère.",
];
const FB_LEGENDES = [
  "Aujourd'hui, la lune est en {phase}. {influence}\n\nHorosphère vous propose une lecture personnalisée, basée sur votre profil de naissance — pas un horoscope générique. À découvrir sur horosphere.fr.",
  "{phase} ce {jour} — {influence}\n\nChaque matin, Horosphère vous offre un moment de clarté avant de commencer la journée. Premiers crédits offerts à l'inscription.",
];
const TIKTOK_HOOKS = [
  "Voici ce que la lune prépare pour VOTRE signe aujourd'hui 👀",
  "Pourquoi ton horoscope générique ne te correspond jamais (et ce qu'on fait différemment)",
  "3 secondes pour savoir ce que dit le ciel sur toi aujourd'hui",
];
const TIKTOK_SCRIPTS = [
  "Accroche (0-3s) : {hook}\nDéveloppement (3-15s) : montrer l'écran d'Horosphère, taper sa date de naissance, faire apparaître le résultat personnalisé.\nChute (15-20s) : \"{phase} aujourd'hui — {influence}\"\nCTA : lien en bio, premiers crédits offerts.",
];

function interpole(texte: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, v), texte);
}

const HASHTAGS_BASE = '#horoscope #astrologie #horosphere #signeastrologique #spiritualite';

async function fallbackSocialContent(dateISO: string): Promise<DailySocialContent> {
  const moon = moonPhaseInfo(new Date(dateISO));
  const jour = new Date(dateISO).toLocaleDateString('fr-FR', { weekday: 'long' });
  const vars = { phase: moon.label.toLowerCase(), influence: moon.influence, jour };
  const rng = mulberry32(hashStr('social::' + dateISO));
  const hook = pick(rng, TIKTOK_HOOKS);
  const images = await imagesDuJour(dateISO);

  return {
    instagram: { legende: interpole(pick(rng, IG_LEGENDES), vars), hashtags: HASHTAGS_BASE + ' #luneDuJour', imageUrl: images.instagram, scriptVideo: null, mode: 'demo' },
    facebook: { legende: interpole(pick(rng, FB_LEGENDES), vars), hashtags: HASHTAGS_BASE, imageUrl: images.facebook, scriptVideo: null, mode: 'demo' },
    tiktok: {
      legende: `${hook} ${HASHTAGS_BASE}`,
      hashtags: HASHTAGS_BASE + ' #pourtoi #fyp',
      imageUrl: null,
      scriptVideo: interpole(pick(rng, TIKTOK_SCRIPTS), { ...vars, hook }),
      mode: 'demo',
    },
  };
}

// ===== Mode IA =====

/** Génère le contenu du jour pour les trois plateformes en un seul appel.
 * Sans clé Anthropic configurée, retombe sur un contenu démo déterministe
 * (jamais de blocage du pipeline de publication). */
export async function generateDailySocialContent(date: Date = new Date()): Promise<DailySocialContent> {
  const dateISO = date.toISOString().slice(0, 10);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return fallbackSocialContent(dateISO);
  }

  const moon = moonPhaseInfo(date);
  const prochainEvenement = nextEventLabel(dateISO);
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
  const prompt = `Tu es le community manager d'Horosphère, une application française d'horoscope personnalisé par IA (thème astral basé sur la date, l'heure et le lieu de naissance — pas un horoscope générique par signe). Écris le contenu marketing du jour pour trois réseaux sociaux, en français.

Contexte du jour (${dateISO}) : phase lunaire réelle = ${moon.label} (${moon.illumination}% d'illumination). ${prochainEvenement ? `Prochain événement du ciel : ${prochainEvenement}.` : ''}

Ton de marque : chaleureux, jamais fataliste ni anxiogène, présente Horosphère comme un rituel doux plutôt qu'une contrainte ou une dépense. N'invente jamais de contenu personnalisé pour un signe précis (ce post est public, pas adressé à un utilisateur) — reste sur la lune du jour, les événements du ciel, et la proposition de valeur d'Horosphère (thème natal réel, premiers crédits offerts, lectures variées).

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :
{
  "instagram": { "legende": "légende Instagram, 2 à 4 phrases courtes, ton chaleureux, emojis avec parcimonie, se termine par une invitation à découvrir Horosphère", "hashtags": "8 à 12 hashtags pertinents séparés par des espaces, en français et anglais mélangés" },
  "facebook": { "legende": "légende Facebook, un peu plus longue et conversationnelle qu'Instagram, moins d'emojis, mentionne la personnalisation réelle (date/heure/lieu de naissance)", "hashtags": "3 à 5 hashtags, moins dense que sur Instagram" },
  "tiktok": { "accroche": "1 phrase choc pour les 3 premières secondes de la vidéo", "script": "script court en 3 temps (accroche / démonstration de l'app / chute+appel à l'action), pensé pour être filmé par une personne réelle, pas pour une vidéo générée", "legende": "légende TikTok courte et punchy", "hashtags": "5 à 8 hashtags TikTok pertinents dont #pourtoi #fyp" }
}`;

  try {
    const parsed = await callClaude(apiKey, model, prompt, 1200);
    const images = await imagesDuJour(dateISO);
    return {
      instagram: {
        legende: String(parsed.instagram?.legende ?? ''),
        hashtags: String(parsed.instagram?.hashtags ?? HASHTAGS_BASE),
        imageUrl: images.instagram,
        scriptVideo: null,
        mode: 'ia',
      },
      facebook: {
        legende: String(parsed.facebook?.legende ?? ''),
        hashtags: String(parsed.facebook?.hashtags ?? HASHTAGS_BASE),
        imageUrl: images.facebook,
        scriptVideo: null,
        mode: 'ia',
      },
      tiktok: {
        legende: String(parsed.tiktok?.legende ?? ''),
        hashtags: String(parsed.tiktok?.hashtags ?? HASHTAGS_BASE),
        imageUrl: null,
        scriptVideo: `Accroche : ${String(parsed.tiktok?.accroche ?? '')}\n\nScript : ${String(parsed.tiktok?.script ?? '')}`,
        mode: 'ia',
      },
    };
  } catch (err) {
    console.error('generateDailySocialContent failed, fallback démo', err);
    return fallbackSocialContent(dateISO);
  }
}
