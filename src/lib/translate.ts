// Traduction à la volée des actualités publiées — celles-ci n'existent
// qu'en français dans `news` (éditées une seule fois dans Airtable, voir
// lib/news.ts). Plutôt que de générer un article distinct par langue, on
// traduit à la demande via Claude Haiku et on met le résultat en cache dans
// `news_translations` (schéma : db/schema.sql) : le coût et la latence de
// traduction ne sont payés qu'une fois par article et par langue, jamais à
// chaque visite. `fr` ne passe jamais par ici (c'est déjà la langue source).
//
// Deux fonctions séparées plutôt qu'une seule "tout traduire" :
// - translatedTitles() : un seul appel IA pour TOUS les titres pas encore
//   en cache (liste des actualités) — traduire 30 titres un par un coûterait
//   30 appels pour rien.
// - translatedArticle() : titre + résumé + contenu d'un seul article, celui
//   effectivement ouvert — le corps d'un article est trop long pour être
//   traité en lot avec les 29 autres.

import { requireDb } from './db';
import { callClaude } from './anthropic';

export type TranslatableNews = { id: string; titre: string; resume: string; contenu: string };
export type NewsLocale = 'en' | 'es';

const LANGUE_NOM: Record<NewsLocale, string> = { en: 'anglais', es: 'espagnol' };

type CachedRow = { news_id: string; titre: string | null; resume: string | null; contenu: string | null };

async function getCached(newsIds: string[], locale: NewsLocale): Promise<Map<string, CachedRow>> {
  if (newsIds.length === 0) return new Map();
  const sql = requireDb();
  const rows = await sql<CachedRow[]>`
    SELECT news_id, titre, resume, contenu FROM news_translations
    WHERE locale = ${locale} AND news_id IN ${sql(newsIds)}
  `;
  return new Map(rows.map((r) => [r.news_id, r]));
}

/** Titres traduits pour une liste d'actualités — un seul appel IA pour tous
 * les articles pas déjà en cache. En cas d'échec (pas de clé IA, erreur
 * réseau), retombe silencieusement sur le titre français plutôt que de
 * casser la page. */
export async function translatedTitles(items: TranslatableNews[], locale: NewsLocale): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (items.length === 0) return result;

  let cached: Map<string, CachedRow>;
  try {
    cached = await getCached(items.map((i) => i.id), locale);
  } catch (err) {
    console.error('translatedTitles: lecture du cache échouée', err);
    cached = new Map();
  }

  const missing = items.filter((i) => {
    const c = cached.get(i.id);
    if (c?.titre) {
      result.set(i.id, c.titre);
      return false;
    }
    return true;
  });
  if (missing.length === 0) return result;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    missing.forEach((i) => result.set(i.id, i.titre));
    return result;
  }

  try {
    const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
    const prompt = `Traduis en ${LANGUE_NOM[locale]} chacun des titres d'articles suivants (application française d'astrologie Horosphère). Traduction fidèle, sans reformuler ni raccourcir.
Réponds UNIQUEMENT avec un objet JSON au format exact {"traductions": ["titre 1 traduit", "titre 2 traduit", ...]}, dans le même ordre que la liste ci-dessous, avec exactement ${missing.length} éléments.

${missing.map((i, idx) => `${idx + 1}. ${i.titre}`).join('\n')}`;
    const parsed = await callClaude(apiKey, model, prompt, 1000);
    const traductions: unknown[] = Array.isArray(parsed?.traductions) ? parsed.traductions : [];

    const sql = requireDb();
    for (let idx = 0; idx < missing.length; idx++) {
      const candidat = typeof traductions[idx] === 'string' ? (traductions[idx] as string).trim() : '';
      // Un titre "traduit" identique au français n'est presque jamais une
      // vraie coïncidence (même sur un titre à base de noms propres, la
      // ponctuation ou la casse diffère normalement) — plus probablement un
      // échec silencieux de l'IA (elle a renvoyé la langue source). On garde
      // le français pour cet affichage, mais SANS le mettre en cache, pour
      // qu'une prochaine requête retente plutôt que de figer l'erreur.
      const echecSilencieux = !candidat || candidat === missing[idx].titre;
      const titre = echecSilencieux ? missing[idx].titre : candidat;
      result.set(missing[idx].id, titre);
      if (echecSilencieux) {
        console.error('translatedTitles: traduction ignorée (identique au français)', { newsId: missing[idx].id, locale });
        continue;
      }
      await sql`
        INSERT INTO news_translations (news_id, locale, titre)
        VALUES (${missing[idx].id}, ${locale}, ${titre})
        ON CONFLICT (news_id, locale) DO UPDATE SET titre = EXCLUDED.titre
      `;
    }
  } catch (err) {
    console.error('translatedTitles: traduction échouée', err);
    missing.forEach((i) => result.set(i.id, i.titre));
  }
  return result;
}

/** Article complet traduit (titre, résumé, contenu) — pour l'actualité
 * effectivement affichée. Retombe sur le contenu français en cas d'échec. */
export async function translatedArticle(item: TranslatableNews, locale: NewsLocale): Promise<TranslatableNews> {
  try {
    const cached = await getCached([item.id], locale);
    const c = cached.get(item.id);
    if (c?.contenu) {
      return { id: item.id, titre: c.titre ?? item.titre, resume: c.resume ?? item.resume, contenu: c.contenu };
    }
  } catch (err) {
    console.error('translatedArticle: lecture du cache échouée', err);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return item;

  try {
    const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
    const prompt = `Traduis fidèlement en ${LANGUE_NOM[locale]} cet article d'actualité astrologique de l'application française Horosphère — sans le résumer, le raccourcir ni changer son sens. Conserve la mise en forme (retours à la ligne, symboles du zodiaque ♈♉♊♋♌♍♎♏♐♑♒♓ éventuels, inchangés).
Réponds UNIQUEMENT avec un objet JSON au format exact :
{"titre": "...", "resume": "...", "contenu": "..."}

Titre : ${item.titre}
Résumé : ${item.resume}
Contenu :
${item.contenu}`;
    const parsed = await callClaude(apiKey, model, prompt, 4000);
    const traduit: TranslatableNews = {
      id: item.id,
      titre: typeof parsed?.titre === 'string' && parsed.titre ? parsed.titre : item.titre,
      resume: typeof parsed?.resume === 'string' ? parsed.resume : item.resume,
      contenu: typeof parsed?.contenu === 'string' && parsed.contenu ? parsed.contenu : item.contenu,
    };
    // Comme pour translatedTitles() : un contenu "traduit" identique au
    // français (titre ET corps) trahit presque toujours un échec silencieux
    // de l'IA plutôt qu'une vraie coïncidence — sur un texte de plusieurs
    // phrases, une traduction authentique ne retombe jamais mot pour mot
    // sur la source. On ne met alors pas ce résultat en cache, pour qu'une
    // prochaine requête retente au lieu de figer l'erreur durablement.
    if (traduit.titre === item.titre && traduit.contenu === item.contenu) {
      console.error('translatedArticle: traduction ignorée (identique au français)', { newsId: item.id, locale });
      return item;
    }
    const sql = requireDb();
    await sql`
      INSERT INTO news_translations (news_id, locale, titre, resume, contenu)
      VALUES (${item.id}, ${locale}, ${traduit.titre}, ${traduit.resume}, ${traduit.contenu})
      ON CONFLICT (news_id, locale) DO UPDATE SET
        titre = EXCLUDED.titre, resume = EXCLUDED.resume, contenu = EXCLUDED.contenu
    `;
    return traduit;
  } catch (err) {
    console.error('translatedArticle: traduction échouée', err);
    return item;
  }
}
