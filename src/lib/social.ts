// Génération du contenu marketing quotidien pour les réseaux sociaux
// (Instagram, Facebook, TikTok) — la partie "équipe IA de création" du
// pipeline de promotion. Réutilise les vraies données de l'application
// (phase lunaire réelle, prochains événements du ciel) plutôt que d'inventer
// du contenu générique. Ne publie jamais rien elle-même : voir
// src/app/api/social/* pour le cycle brouillon -> approuvé -> publié.

import { moonPhaseInfo } from '../components/MoonPhase';
import { getUpcomingSkyEvents } from './skyEvents';
import { callClaude, generateHoroscope } from './anthropic';
import { genererIllustrationTotem } from './openaiImage';
import { imageFixeSigne } from './signImages';
import { soumettreAvatarVideo } from './heygen';
import { SIGNS, type Sign } from './zodiac';
import { mulberry32, hashStr, pick } from './fallback-generator';

export type SocialDraft = {
  legende: string;
  hashtags: string;
  imageUrl: string | null;
  scriptVideo: string | null;
  mode: 'ia' | 'demo';
  // TikTok uniquement : identifiant du rendu HeyGen soumis à partir de
  // `scriptVideo` (voir soumettreVideoAvatarTiktok) — absent si
  // HEYGEN_API_KEY n'est pas configurée ou si la soumission a échoué
  // (jamais bloquant : le script texte reste disponible dans tous les cas).
  heygenVideoId?: string | null;
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

// Nombre de jours écoulés depuis l'epoch Unix pour une date ISO — sert de
// compteur stable pour faire tourner les visuels en séquence (voir
// visuelDuJour ci-dessous) plutôt qu'un tirage pseudo-aléatoire, qui
// pouvait par hasard répéter la même image deux jours de suite.
function joursDepuisEpoque(dateISO: string): number {
  return Math.floor(new Date(`${dateISO}T00:00:00Z`).getTime() / 86_400_000);
}

/** Rotation SÉQUENTIELLE (pas aléatoire) sur les visuels du site : garantit
 * qu'un visuel n'est jamais réutilisé avant que tous les autres ne soient
 * passés — sur retour direct de l'utilisateur ("l'image Facebook ne me
 * plaît pas, prends une du site non utilisée dans un post"), qui avait
 * jusque-là de bonnes chances de retomber sur le même visuel plusieurs
 * jours de suite avec le tirage pseudo-aléatoire précédent. */
export function visuelDuJour(dateISO: string): string {
  return siteUrl() + VISUELS[joursDepuisEpoque(dateISO) % VISUELS.length];
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

/** Résout le visuel Facebook du jour : une vraie photo du site, en rotation
 * (voir visuelDuJour) — plus de génération IA ici (genererIllustrationSociale,
 * retirée) sur retour direct de l'utilisateur, qui n'aimait pas le rendu des
 * scènes générées. Instagram a son propre visuel, thématisé par signe (voir
 * genererPostInstagramSigne). */
function imageFacebookDuJour(dateISO: string): string {
  return visuelDuJour(dateISO);
}

// ===== Instagram : horoscope complet gratuit, un signe différent chaque jour =====
//
// Contrairement à Facebook/TikTok (contenu marketing générique sur la lune
// du jour), Instagram porte désormais un vrai contenu de valeur : la
// lecture complète d'un signe, offerte, en rotation sur les 12 signes —
// une raison concrète de revenir voir la page, et un post qui ne vend
// rien plutôt que d'empiler les appels à l'action. Volontairement la
// version GÉNÉRIQUE par signe (feature 'horoscope_quotidien', sans
// naissance) : jamais la version personnalisée thème natal, qui reste
// l'exclusivité de l'app.

/** Rotation continue sur l'année (jour de l'année % 12), pas seulement sur
 * la semaine : contrairement aux reels (lundi-samedi), ce post sort tous
 * les jours, week-end compris. */
function signeDuJourInstagram(date: Date): Sign {
  const debutAnnee = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const jourAnnee = Math.floor((date.getTime() - debutAnnee.getTime()) / 86_400_000);
  return SIGNS[jourAnnee % SIGNS.length];
}

// À partir du 14 septembre 2026 (décision explicite de l'utilisateur : "on
// devait faire 2 signes par jour"), Facebook porte aussi une lecture
// complète par signe — toujours DIFFÉRENT de celui d'Instagram (décalage
// d'une demi-rotation, 6 signes sur 12) pour ne jamais publier deux fois le
// même signe le même jour sur les deux plateformes. Avant cette date,
// Facebook garde son contenu marketing générique (genererFacebookTiktok).
export const SEUIL_DEUX_SIGNES = '2026-09-14';

function signeDuJourFacebook(date: Date): Sign {
  const debutAnnee = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const jourAnnee = Math.floor((date.getTime() - debutAnnee.getTime()) / 86_400_000);
  return SIGNS[(jourAnnee + SIGNS.length / 2) % SIGNS.length];
}

/** Ligne de renvoi croisé, douce et marketing, vers l'autre plateforme —
 * ajoutée uniquement quand deux signes différents sortent le même jour
 * (voir SEUIL_DEUX_SIGNES). Absente sinon (comportement historique
 * inchangé pour les posts avant le 14 septembre). */
function ligneRenvoiCroise(reseau: 'Facebook' | 'Instagram', autreSigne: Sign): string {
  return reseau === 'Facebook'
    ? `📸 Un autre signe est à l'honneur aujourd'hui sur notre page Facebook : ${autreSigne.symbole} ${autreSigne.nom}.`
    : `📱 Et sur notre compte Instagram aujourd'hui : ${autreSigne.symbole} ${autreSigne.nom}.`;
}

/** Construit le post Instagram du jour à partir d'une vraie lecture
 * (generateHoroscope, qui a déjà son propre repli déterministe sans clé
 * Anthropic — inutile de dupliquer cette logique ici). `autreSigne`, quand
 * fourni, ajoute le renvoi croisé vers le signe du jour sur Facebook (voir
 * SEUIL_DEUX_SIGNES). */
async function genererPostInstagramSigne(date: Date, sign: Sign, autreSigne?: Sign): Promise<SocialDraft> {
  const dateISO = date.toISOString().slice(0, 10);
  const reading = await generateHoroscope({ feature: 'horoscope_quotidien', sign, dateISO, langue: 'fr' });

  const legende = [
    `${sign.symbole} ${sign.nom} — ${reading.headline}`,
    '',
    `💛 Amour : ${reading.amour}`,
    `💼 Travail : ${reading.travail}`,
    `⚡ Énergie : ${reading.energie}`,
    '',
    `✨ Action du jour : ${reading.conseil}`,
    '',
    `Chaque signe a son jour sur Horosphère — découvre le tien sur horosphere.fr.`,
    ...(autreSigne ? ['', ligneRenvoiCroise('Instagram', autreSigne)] : []),
  ].join('\n');

  // Illustration EXCLUSIVEMENT tirée des visuels fixes fournis par
  // l'utilisateur (voir lib/signImages.ts) — envoyée TELLE QUELLE, sans
  // aucune composition ni recadrage. Une version antérieure composait un
  // bandeau de texte sous l'image via /api/og/signe-post ; abandonné sur
  // retour explicite de l'utilisateur ("voici la bonne photo non
  // tronquée"), qui a définitivement tranché : jamais de crop de ces
  // illustrations, jamais de logique de rendu supplémentaire qui
  // pourrait la déformer. Aucune perte réelle : le texte du jour
  // (accroche + conseil) est de toute façon déjà repris intégralement
  // dans la légende du post ci-dessus. La génération IA
  // (genererIllustrationTotem) ne sert plus que de filet de sécurité si
  // un visuel venait à manquer pour un signe.
  let imageUrl: string | null = null;
  const cheminFixe = imageFixeSigne(sign.key);
  if (cheminFixe) {
    imageUrl = `${siteUrl()}${cheminFixe}`;
  } else {
    try {
      imageUrl = await genererIllustrationTotem(sign.nom, `${dateISO}-ig-${sign.key}`);
    } catch (err) {
      console.error('genererPostInstagramSigne: illustration IA échouée, repli visuel statique', err);
    }
  }
  if (!imageUrl) imageUrl = visuelInstagramDuJour(dateISO);

  return {
    legende,
    hashtags: `${HASHTAGS_BASE} #${sign.key} #horoscope${sign.nom.replace(/\s/g, '')}`,
    imageUrl,
    scriptVideo: null,
    mode: reading.mode,
  };
}

/** Symétrique de genererPostInstagramSigne pour Facebook, actif à partir du
 * 14 septembre 2026 (voir SEUIL_DEUX_SIGNES) — même contenu de valeur (une
 * vraie lecture, pas du marketing générique), sur un signe différent de
 * celui d'Instagram, avec son propre renvoi croisé. */
async function genererPostFacebookSigne(date: Date, sign: Sign, autreSigne: Sign): Promise<SocialDraft> {
  const dateISO = date.toISOString().slice(0, 10);
  const reading = await generateHoroscope({ feature: 'horoscope_quotidien', sign, dateISO, langue: 'fr' });

  const legende = [
    `${sign.symbole} ${sign.nom} — ${reading.headline}`,
    '',
    `💛 Amour : ${reading.amour}`,
    `💼 Travail : ${reading.travail}`,
    `⚡ Énergie : ${reading.energie}`,
    '',
    `✨ Action du jour : ${reading.conseil}`,
    '',
    `Chaque signe a son jour sur Horosphère — découvre le tien sur horosphere.fr.`,
    '',
    ligneRenvoiCroise('Facebook', autreSigne),
  ].join('\n');

  // Même principe que côté Instagram (voir plus haut) : visuel fixe par
  // signe en priorité, jamais recadré. Facebook acceptant un plus large
  // éventail de ratios/formats, le repli utilise la rotation générique
  // (visuelDuJour) plutôt que le set JPEG dédié à Instagram.
  let imageUrl: string | null = null;
  const cheminFixe = imageFixeSigne(sign.key);
  if (cheminFixe) {
    imageUrl = `${siteUrl()}${cheminFixe}`;
  } else {
    try {
      imageUrl = await genererIllustrationTotem(sign.nom, `${dateISO}-fb-${sign.key}`);
    } catch (err) {
      console.error('genererPostFacebookSigne: illustration IA échouée, repli visuel statique', err);
    }
  }
  if (!imageUrl) imageUrl = visuelDuJour(dateISO);

  return {
    legende,
    hashtags: `${HASHTAGS_BASE} #${sign.key} #horoscope${sign.nom.replace(/\s/g, '')}`,
    imageUrl,
    scriptVideo: null,
    mode: reading.mode,
  };
}

// ===== Mode démo (sans clé Anthropic) — Facebook et TikTok uniquement,
// Instagram étant géré par genererPostInstagramSigne ci-dessus. =====

const FB_LEGENDES = [
  "Aujourd'hui, la lune est en {phase}. {influence}\n\nHorosphère traduit ça en une action concrète pour votre journée, ajustée à votre profil de naissance. À découvrir sur horosphere.fr.",
  "{phase} ce {jour} — {influence}\n\nChaque matin, Horosphère vous donne une lecture claire ET une action à mener pour avancer. Premiers crédits offerts à l'inscription.",
  "Ce {jour}, le ciel est en {phase}. {influence}\n\nUne lecture par jour, une action à mener — c'est tout ce qu'Horosphère vous demande de temps.",
];
const TIKTOK_HOOKS = [
  "Voici l'action à mener aujourd'hui selon TON signe 👀",
  "Pourquoi ton horoscope générique ne te dit jamais quoi FAIRE (et ce qu'on fait différemment)",
  "3 secondes pour savoir quoi faire aujourd'hui, selon le ciel",
];
// Monologue pur, pensé pour être lu par un avatar vidéo (HeyGen) — pas
// d'indication de tournage ("montrer l'écran...") comme dans une ancienne
// version pensée pour être filmée par une vraie personne : voir
// soumettreVideoAvatarTiktok, qui envoie ce texte tel quel à l'avatar.
const TIKTOK_SCRIPTS = [
  "{hook} {phase} aujourd'hui — {influence}. Sur Horosphère, on ne vous sort pas l'horoscope générique de votre signe : votre thème natal réel, calculé à partir de votre date, votre heure et votre lieu de naissance, vous dit ce qu'il y a vraiment à faire aujourd'hui. Premiers crédits offerts, lien en bio.",
];

function interpole(texte: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, v), texte);
}

/** Soumet le script TikTok à HeyGen pour générer la vidéo avatar (voir
 * lib/heygen.ts) — jamais bloquant : renvoie `null` sans lever d'erreur si
 * la soumission échoue, le script texte restant de toute façon disponible
 * dans le brouillon Airtable. Le rendu est asynchrone : l'identifiant
 * renvoyé est à interroger via /api/social/reel-status (provider "heygen")
 * pour récupérer l'URL finale.
 *
 * Volontairement DÉSACTIVÉ par défaut, et via un interrupteur DÉDIÉ
 * (HEYGEN_TIKTOK_AUTO=true), indépendant de HEYGEN_AVATAR_ID/HEYGEN_VOICE_ID
 * — ces deux dernières variables servent à choisir l'avatar du récap vidéo
 * du dimanche (lib/reels.ts, genererRecapDimanche) et NE DOIVENT PAS
 * réactiver la génération quotidienne par effet de bord : décision
 * explicite de l'utilisateur ("HeyGen actif que pour dimanche soir"). */
async function soumettreVideoAvatarTiktok(script: string): Promise<string | null> {
  if (!process.env.HEYGEN_API_KEY || process.env.HEYGEN_TIKTOK_AUTO !== 'true') return null;
  try {
    return await soumettreAvatarVideo(script);
  } catch (err) {
    console.error('soumettreVideoAvatarTiktok: soumission HeyGen échouée', err);
    return null;
  }
}

const HASHTAGS_BASE = '#horoscope #astrologie #horosphere #signeastrologique #developpementpersonnel';

async function genererFacebookTiktokDemo(dateISO: string): Promise<{ facebook: SocialDraft; tiktok: SocialDraft }> {
  const moon = moonPhaseInfo(new Date(dateISO));
  const jour = new Date(dateISO).toLocaleDateString('fr-FR', { weekday: 'long' });
  const vars = { phase: moon.label.toLowerCase(), influence: moon.influence, jour };
  const rng = mulberry32(hashStr('social::' + dateISO));
  const hook = pick(rng, TIKTOK_HOOKS);
  const fbLegende = interpole(pick(rng, FB_LEGENDES), vars);
  const imageFacebook = imageFacebookDuJour(dateISO);
  const scriptTiktok = interpole(pick(rng, TIKTOK_SCRIPTS), { ...vars, hook });
  const heygenVideoId = await soumettreVideoAvatarTiktok(scriptTiktok);

  return {
    facebook: { legende: fbLegende, hashtags: HASHTAGS_BASE, imageUrl: imageFacebook, scriptVideo: null, mode: 'demo' },
    tiktok: {
      legende: `${hook} ${HASHTAGS_BASE}`,
      hashtags: HASHTAGS_BASE + ' #pourtoi #fyp',
      imageUrl: null,
      scriptVideo: scriptTiktok,
      mode: 'demo',
      heygenVideoId,
    },
  };
}

// ===== Mode IA =====

async function genererFacebookTiktokIA(dateISO: string, apiKey: string): Promise<{ facebook: SocialDraft; tiktok: SocialDraft }> {
  const moon = moonPhaseInfo(new Date(dateISO));
  const prochainEvenement = nextEventLabel(dateISO);
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
  const prompt = `Tu es le community manager d'Horosphère, une application française de développement personnel par les astres (thème astral basé sur la date, l'heure et le lieu de naissance). Écris le contenu marketing du jour pour Facebook et TikTok, en français.

Contexte du jour (${dateISO}) : phase lunaire réelle = ${moon.label} (${moon.illumination}% d'illumination). ${prochainEvenement ? `Prochain événement du ciel : ${prochainEvenement}.` : ''}

Ton de marque : direct, chaleureux, jamais fataliste ni anxiogène. Horosphère est un outil d'action : chaque post relie la donnée astrologique du jour à ce qu'elle permet de faire, pour donner envie d'agir. Ce post est public (pas adressé à un utilisateur précis) : n'invente aucun contenu personnalisé pour un signe donné — reste sur la lune du jour, les événements du ciel, et la proposition de valeur d'Horosphère (une lecture ET une action concrète, thème natal réel, premiers crédits offerts).

Variété, important : ce post est généré chaque jour, et la phase lunaire ne change que tous les 2-3 jours — évite donc que la structure se répète d'un jour à l'autre. Concrètement :
- Varie le point d'entrée : pas systématiquement "la lune est en [phase]" en première phrase — parfois commence par l'action à mener, un événement du ciel, ou une observation du quotidien.
- Bannis la comparaison "des millions/milliards de [signe/personnes]" pour dénigrer l'horoscope générique — c'est une formule déjà beaucoup utilisée, trouve une autre façon de valoriser la personnalisation.
- Bannis la question rhétorique "Mais comment savoir...?" comme pivot vers le pitch — varie la transition.
- N'oblige pas chaque post à se terminer par un appel à l'action explicite : certains jours, une observation ou un conseil qui se suffit à lui-même est plus fort qu'un pitch systématique.

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :
{
  "facebook": { "legende": "légende Facebook, 2 à 4 phrases, conversationnelle, peu d'emojis, mentionne la personnalisation réelle (date/heure/lieu de naissance) quand c'est naturel", "hashtags": "3 à 5 hashtags" },
  "tiktok": { "script": "texte intégral à lire à voix haute par un avatar vidéo (15 à 25 secondes de parole, pas d'indication de tournage ni de mise en scène) : commence par une phrase choc, enchaîne sur la proposition de valeur, termine par un appel à l'action", "legende": "légende TikTok courte et punchy", "hashtags": "5 à 8 hashtags TikTok pertinents dont #pourtoi #fyp" }
}`;

  const parsed = await callClaude(apiKey, model, prompt, 900);
  const imageFacebook = imageFacebookDuJour(dateISO);
  const scriptTiktokIA = String(parsed.tiktok?.script ?? '').trim();
  return {
    facebook: {
      legende: String(parsed.facebook?.legende ?? ''),
      hashtags: String(parsed.facebook?.hashtags ?? HASHTAGS_BASE),
      imageUrl: imageFacebook,
      scriptVideo: null,
      mode: 'ia',
    },
    tiktok: {
      legende: String(parsed.tiktok?.legende ?? ''),
      hashtags: String(parsed.tiktok?.hashtags ?? HASHTAGS_BASE),
      imageUrl: null,
      scriptVideo: scriptTiktokIA,
      mode: 'ia',
      heygenVideoId: scriptTiktokIA ? await soumettreVideoAvatarTiktok(scriptTiktokIA) : null,
    },
  };
}

async function genererFacebookTiktok(dateISO: string): Promise<{ facebook: SocialDraft; tiktok: SocialDraft }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      return await genererFacebookTiktokIA(dateISO, apiKey);
    } catch (err) {
      console.error('genererFacebookTiktokIA a échoué, repli démo', err);
    }
  }
  return genererFacebookTiktokDemo(dateISO);
}

/** Génère le contenu du jour pour les trois plateformes.
 *
 * À partir du 14 septembre 2026 (SEUIL_DEUX_SIGNES), Instagram et Facebook
 * portent chacun une lecture complète mais sur un signe DIFFÉRENT, avec un
 * renvoi croisé doux vers l'autre réseau — TikTok reste du marketing
 * générique (genererFacebookTiktok, inchangé). Avant cette date, seul
 * Instagram est par signe ; Facebook/TikTok restent le pipeline marketing
 * générique historique. Dans tous les cas, chaque pipeline a son propre
 * repli déterministe : jamais de blocage de la publication. */
export async function generateDailySocialContent(date: Date = new Date()): Promise<DailySocialContent> {
  const dateISO = date.toISOString().slice(0, 10);

  if (dateISO >= SEUIL_DEUX_SIGNES) {
    const signeInstagram = signeDuJourInstagram(date);
    const signeFacebook = signeDuJourFacebook(date);
    const [instagram, facebook, { tiktok }] = await Promise.all([
      genererPostInstagramSigne(date, signeInstagram, signeFacebook),
      genererPostFacebookSigne(date, signeFacebook, signeInstagram),
      genererFacebookTiktok(dateISO),
    ]);
    return { instagram, facebook, tiktok };
  }

  const [instagram, { facebook, tiktok }] = await Promise.all([
    genererPostInstagramSigne(date, signeDuJourInstagram(date)),
    genererFacebookTiktok(dateISO),
  ]);
  return { instagram, facebook, tiktok };
}
