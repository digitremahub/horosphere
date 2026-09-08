// Contenu des reels — 2 signes par jour (matin + après-midi) du lundi au
// samedi, couvrant l'ensemble des 12 signes une fois par semaine dans
// l'ordre du zodiaque, puis un récap de tous les signes le dimanche porté
// par un avatar vidéo (voir lib/heygen.ts). Les reels du lundi au samedi
// utilisent un rendu "carte animée" (voir lib/shotstack.ts) : image de fond
// + texte, pas de voix — cohérent avec le choix fait pour le pipeline photo
// existant, moins coûteux et plus rapide à produire à ce rythme.

import { moonPhaseInfo } from '../components/MoonPhase';
import { SIGNS, type Sign } from './zodiac';
import { callClaude } from './anthropic';
import { genererIllustrationSociale } from './openaiImage';
import { visuelDuJour } from './social';
import { soumettreRenderReel } from './shotstack';
import { soumettreAvatarVideo } from './heygen';
import { mulberry32, hashStr, pick } from './fallback-generator';

export type CreneauReel = 'matin' | 'apres-midi';

/** Les deux signes du jour pour le créneau donné, ou `null` le dimanche
 * (jour du récap, pas de reel signe-par-signe). Lundi = les 2 premiers
 * signes du zodiaque (Bélier, Taureau), mardi les 2 suivants, etc. — un
 * cycle complet des 12 signes toutes les semaines, sans état à conserver
 * puisque c'est entièrement déterminé par le jour de la semaine. */
export function signeDuCreneau(date: Date, creneau: CreneauReel): Sign | null {
  const jourISO = (date.getDay() + 6) % 7; // 0 = lundi ... 6 = dimanche
  if (jourISO === 6) return null; // dimanche : récap, pas de signe unique
  const idx = jourISO * 2 + (creneau === 'matin' ? 0 : 1);
  return SIGNS[idx];
}

const ELEMENT_AMBIANCE: Record<Sign['element'], string> = {
  Feu: 'des couleurs chaudes et dynamiques, une lumière vive comme une flamme ou un lever de soleil',
  Terre: 'des tons profonds et ancrés, une scène minérale ou végétale, stable et rassurante',
  Air: 'une ambiance légère et aérienne, ciel dégagé, mouvement de vent ou de nuages',
  Eau: 'une ambiance fluide et onirique, reflets sur l\'eau, brume douce, tons bleutés',
};

function sujetIllustrationSigne(sign: Sign, texte: string): string {
  return `Une scène symbolique pour le signe astrologique ${sign.nom} (élément ${sign.element}, planète maîtresse ${sign.planete}) : ${ELEMENT_AMBIANCE[sign.element]}. Le message du jour pour ce signe : "${texte.slice(0, 200)}" — que l'ambiance évoque cette idée (jamais de texte, lettres ou mots visibles dans l'image, jamais le symbole du signe dessiné littéralement).`;
}

const TEXTES_DEMO = [
  "{planete} vous pousse à avancer aujourd'hui — écoutez ce que {element} vous inspire.",
  "Une journée sous le signe de {element} : {planete} éclaire ce qui compte vraiment pour vous.",
  "{phase} accompagne votre élan du jour — {planete} vous montre la voie.",
];

/** Message court (1-2 phrases) pour un signe donné, dans un style reel —
 * percutant, jamais générique. Retombe sur un texte déterministe (sans
 * appel IA) si ANTHROPIC_API_KEY est absente ou que l'appel échoue. */
export async function texteReelSigne(sign: Sign, date: Date): Promise<string> {
  const moon = moonPhaseInfo(date);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const dateISO = date.toISOString().slice(0, 10);

  if (apiKey) {
    try {
      const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
      const prompt = `Écris un message court (1 à 2 phrases, 25 mots maximum) pour un reel Instagram/Facebook d'astrologie, destiné au signe ${sign.nom} (élément ${sign.element}, planète maîtresse ${sign.planete}). Contexte du jour : lune en ${moon.label.toLowerCase()}. Ton chaleureux, percutant, jamais générique ni fataliste — donne envie d'en savoir plus. Ne mentionne pas Horosphère (c'est déjà dans la légende du post). Réponds intégralement en français, sans aucun mot anglais. Réponds UNIQUEMENT avec un objet JSON {"texte": "..."}.`;
      const parsed = await callClaude(apiKey, model, prompt, 300);
      if (typeof parsed?.texte === 'string' && parsed.texte.trim()) return parsed.texte.trim();
    } catch (err) {
      console.error('texteReelSigne: appel IA échoué, repli démo', err);
    }
  }

  const rng = mulberry32(hashStr(`reel::${sign.key}::${dateISO}`));
  return pick(rng, TEXTES_DEMO)
    .replaceAll('{planete}', sign.planete)
    .replaceAll('{element}', sign.element)
    .replaceAll('{phase}', moon.label);
}

/** Contenu complet d'un reel quotidien : signe du jour, texte, et rendu
 * vidéo SOUMIS (pas encore terminé — voir /api/social/reel-status pour en
 * suivre l'avancement). `null` si on est dimanche (voir `recapDimanche`). */
export async function genererReelDuJour(date: Date, creneau: CreneauReel) {
  const sign = signeDuCreneau(date, creneau);
  if (!sign) return null;

  const texte = await texteReelSigne(sign, date);
  const dateISO = date.toISOString().slice(0, 10);

  let imageUrl: string | null = null;
  try {
    imageUrl = await genererIllustrationSociale(sujetIllustrationSigne(sign, texte), `${dateISO}-${sign.key}`);
  } catch (err) {
    console.error('genererReelDuJour: illustration IA échouée, repli visuel statique', err);
  }
  if (!imageUrl) imageUrl = visuelDuJour(dateISO);

  const renderId = await soumettreRenderReel({ imageUrl, titre: `${sign.symbole} ${sign.nom}`, texte });

  return { sign: sign.nom, texte, renderId, provider: 'shotstack' as const };
}

/** Script du récap dominical : une ligne par signe, dans l'ordre du
 * zodiaque, lue par l'avatar HeyGen. Un seul appel IA pour les 12 lignes
 * (comme translatedTitles() pour les traductions) plutôt que 12 appels. */
async function scriptRecapSemaine(date: Date): Promise<string> {
  const moon = moonPhaseInfo(date);
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    try {
      const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
      const liste = SIGNS.map((s) => `${s.nom} (élément ${s.element}, planète ${s.planete})`).join(', ');
      const prompt = `Écris le script d'une vidéo de récap hebdomadaire d'astrologie, à lire à voix haute par un avatar vidéo. Contexte : lune en ${moon.label.toLowerCase()} en ce moment. Pour chacun des 12 signes suivants, dans cet ordre, écris UNE phrase courte et chaleureuse (message de la semaine) : ${liste}. Commence par une phrase d'introduction générale (1 phrase), puis les 12 phrases signe par signe en commençant chacune par le nom du signe, puis termine par une phrase de clôture invitant à découvrir sa lecture complète sur Horosphère. Réponds intégralement en français, sans aucun mot anglais. Réponds UNIQUEMENT avec un objet JSON {"script": "texte complet, phrases séparées par des sauts de ligne"}.`;
      const parsed = await callClaude(apiKey, model, prompt, 1200);
      if (typeof parsed?.script === 'string' && parsed.script.trim()) return parsed.script.trim();
    } catch (err) {
      console.error('scriptRecapSemaine: appel IA échoué, repli démo', err);
    }
  }

  const rng = mulberry32(hashStr(`recap::${date.toISOString().slice(0, 10)}`));
  const lignes = SIGNS.map((s) => `${s.nom} : ${pick(rng, TEXTES_DEMO).replaceAll('{planete}', s.planete).replaceAll('{element}', s.element).replaceAll('{phase}', moon.label)}`);
  return [`Cette semaine, la lune est en ${moon.label.toLowerCase()}.`, ...lignes, 'Retrouvez votre lecture complète sur Horosphère.'].join('\n');
}

/** Contenu du récap dominical : script complet et vidéo avatar SOUMISE
 * (voir /api/social/reel-status, provider 'heygen', pour son avancement). */
export async function genererRecapDimanche(date: Date) {
  const script = await scriptRecapSemaine(date);
  const videoId = await soumettreAvatarVideo(script);
  return { script, renderId: videoId, provider: 'heygen' as const };
}
