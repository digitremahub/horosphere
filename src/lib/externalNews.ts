// Contenu externe pour la page /actualites — en complément de nos propres
// articles (voir lib/news.ts), pas à leur place : deux sources, jamais
// mélangées avec le contenu édité par le community manager.
//
// 1) Liens choisis à la main (CURATED_EXTERNAL_LINKS ci-dessous) — ajoutés
//    par simple édition de ce fichier quand quelqu'un fournit une URL à
//    inclure. Toujours affichés (c'est un choix éditorial délibéré).
// 2) Flux RSS/Atom (RSS_FEEDS) — récupérés à chaque régénération de la page
//    (voir `revalidate` dans actualites/page.tsx), en complément si la
//    place le permet. Un flux qui échoue (URL invalide, site indisponible,
//    XML illisible) est simplement ignoré : jamais d'erreur visible pour
//    un contenu qui reste secondaire par nature.
//
// On ne reproduit jamais le contenu d'un article externe : uniquement son
// titre, un court extrait, une image si le flux en fournit une, et un lien
// qui ouvre l'article d'origine dans un nouvel onglet.

import { XMLParser } from 'fast-xml-parser';
import { callClaude } from './anthropic';

export type ExternalItem = {
  titre: string;
  lien: string;
  source: string;
  image: string | null;
  extrait: string;
  publieLe: string | null;
  langue?: 'fr' | 'en';
  // Vrai quand `titre`/`extrait` sont une traduction (voir traduireEnFrancais
  // ci-dessous) — sert à afficher "traduit de l'anglais" plutôt que
  // "en anglais" sur la carte.
  traduit?: boolean;
};

/** Liens choisis à la main. Pour en ajouter un : titre, lien, source
 * (nom du site), et un court extrait de présentation (jamais copié tel
 * quel depuis l'article — une phrase de contexte). `image` est optionnelle. */
export const CURATED_EXTERNAL_LINKS: ExternalItem[] = [];

/** Flux RSS/Atom interrogés à chaque régénération de la page. NASA APOD est
 * l'un des flux RSS les plus anciens et stables du web (inchangé depuis
 * plus de vingt ans) — choisi comme premier flux pour cette raison, malgré
 * son contenu en anglais, traduit en français (voir traduireEnFrancais)
 * avant affichage. D'autres flux (astronomie ou astrologie francophones,
 * qui n'auraient pas besoin de traduction) peuvent être ajoutés ici dès
 * qu'une URL de flux valide est connue. */
const RSS_FEEDS: { nom: string; url: string; langue: 'fr' | 'en' }[] = [
  { nom: 'NASA', url: 'https://apod.nasa.gov/apod.rss', langue: 'en' },
];

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', textNodeName: '#text' });

/** Décode les entités HTML/XML, y compris numériques (&#60; / &#x3C;) — le
 * flux NASA APOD notamment échappe deux fois le HTML de sa description
 * (&amp;#60; dans le XML brut), donc au moins une couche d'entités
 * numériques subsiste après le décodage XML déjà fait par fast-xml-parser. */
function decodeEntities(texte: string): string {
  return texte
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function stripHtml(html: string): string {
  // Deux passes : une balise peut n'apparaître qu'après décodage des
  // entités (cas du double échappement ci-dessus), donc décoder avant de
  // retirer les balises, puis nettoyer les entités résiduelles au cas où.
  const decode = (s: string) => decodeEntities(decodeEntities(s));
  return decode(decode(html))
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extraitDe(html: string, maxLen = 180): string {
  const texte = stripHtml(html);
  return texte.length > maxLen ? `${texte.slice(0, maxLen).trimEnd()}…` : texte;
}

/** Cherche une image dans les champs RSS/Atom usuels (enclosure,
 * media:content, media:thumbnail), sinon dans la première balise <img> du
 * contenu HTML de l'article — les flux ne fournissent pas tous une image
 * de la même façon. */
function imageDe(item: any): string | null {
  const enclosureUrl = item?.enclosure?.['@_url'];
  if (typeof enclosureUrl === 'string' && item?.enclosure?.['@_type']?.startsWith?.('image')) return enclosureUrl;
  const mediaContent = item?.['media:content'];
  const mediaUrl = Array.isArray(mediaContent) ? mediaContent[0]?.['@_url'] : mediaContent?.['@_url'];
  if (typeof mediaUrl === 'string') return mediaUrl;
  const mediaThumb = item?.['media:thumbnail']?.['@_url'];
  if (typeof mediaThumb === 'string') return mediaThumb;
  const html = String(item?.description ?? item?.['content:encoded'] ?? item?.summary ?? item?.content ?? '');
  const match = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  return match ? match[1] : null;
}

function lienDe(item: any): string | null {
  if (typeof item?.link === 'string') return item.link;
  // Atom : <link href="..."/> ou tableau de liens.
  const link = item?.link;
  if (Array.isArray(link)) {
    const alt = link.find((l) => !l?.['@_rel'] || l['@_rel'] === 'alternate');
    return alt?.['@_href'] ?? link[0]?.['@_href'] ?? null;
  }
  if (link?.['@_href']) return link['@_href'];
  return null;
}

async function fetchOneFeed(feed: { nom: string; url: string; langue: 'fr' | 'en' }, perFeedLimit: number): Promise<ExternalItem[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'Horosphere/1.0 (+https://horosphere.fr)', Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const data = parser.parse(xml);
    const rawItems: any[] = data?.rss?.channel?.item
      ? [].concat(data.rss.channel.item)
      : data?.feed?.entry
      ? [].concat(data.feed.entry)
      : [];

    return rawItems
      .slice(0, perFeedLimit)
      .map((item): ExternalItem | null => {
        const lien = lienDe(item);
        const titre = stripHtml(String(item?.title?.['#text'] ?? item?.title ?? ''));
        if (!lien || !titre) return null;
        const descriptionBrute = String(item?.description ?? item?.summary ?? item?.['content:encoded'] ?? item?.content ?? '');
        const dateBrute = item?.pubDate ?? item?.published ?? item?.updated ?? null;
        const publieLe = dateBrute ? new Date(dateBrute).toISOString() : null;
        return {
          titre,
          lien,
          source: feed.nom,
          image: imageDe(item),
          extrait: extraitDe(descriptionBrute),
          publieLe: publieLe && !Number.isNaN(Date.parse(publieLe)) ? publieLe : null,
          langue: feed.langue,
        };
      })
      .filter((x): x is ExternalItem => x !== null);
  } catch (err) {
    console.error(`fetchOneFeed failed for ${feed.nom} (${feed.url})`, err);
    return [];
  }
}

/** Traduit titre + extrait en français via l'IA déjà utilisée ailleurs sur
 * le site (voir lib/anthropic.ts) — le site est entièrement en français,
 * un contenu externe en anglais (NASA notamment) n'a pas sa place tel
 * quel. Mémorisée en mémoire par URL d'article (le contenu d'un article
 * publié ne change plus) pour éviter de retraduire à chaque régénération
 * de la page (revalidate = 300). Sans clé IA configurée, ou en cas
 * d'échec, l'item est renvoyé tel quel — jamais bloquant, jamais un texte
 * inventé à la place de la traduction. */
const traductionsCache = new Map<string, { titre: string; extrait: string }>();

async function traduireEnFrancais(item: ExternalItem): Promise<ExternalItem> {
  if (item.langue !== 'en') return item;

  const enCache = traductionsCache.get(item.lien);
  if (enCache) return { ...item, ...enCache, traduit: true };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return item;

  try {
    const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
    const prompt = `Traduis fidèlement ce titre et cet extrait d'article en français courant — une traduction, pas un résumé ni une reformulation. Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :
{"titre": "...", "extrait": "..."}

Titre : ${item.titre}
Extrait : ${item.extrait}`;
    const parsed = await callClaude(apiKey, model, prompt, 400);
    const traduction = { titre: String(parsed.titre ?? item.titre), extrait: String(parsed.extrait ?? item.extrait) };
    traductionsCache.set(item.lien, traduction);
    return { ...item, ...traduction, traduit: true };
  } catch (err) {
    console.error(`traduireEnFrancais failed for ${item.lien}`, err);
    return item;
  }
}

/** Combine les flux RSS configurés (au mieux — un flux en échec est
 * simplement absent du résultat) et les trie du plus récent au plus
 * ancien. Ne lève jamais d'exception : cette section est un bonus, jamais
 * un point de blocage pour le reste de la page. */
export async function fetchExternalRssItems(limit = 6): Promise<ExternalItem[]> {
  if (RSS_FEEDS.length === 0) return [];
  const parPage = Math.max(2, Math.ceil(limit / RSS_FEEDS.length) + 1);
  const resultats = await Promise.all(RSS_FEEDS.map((feed) => fetchOneFeed(feed, parPage)));
  return resultats
    .flat()
    .sort((a, b) => (b.publieLe ?? '').localeCompare(a.publieLe ?? ''))
    .slice(0, limit);
}

/** Section complète affichée sur /actualites : les liens choisis à la main
 * d'abord (choix éditorial délibéré, toujours visibles), puis des éléments
 * de flux RSS pour compléter jusqu'à `limit`, sans doublon d'URL. */
export async function getExternalNewsSection(limit = 8): Promise<ExternalItem[]> {
  const curated = CURATED_EXTERNAL_LINKS;
  const placesRestantes = Math.max(0, limit - curated.length);
  const rss = placesRestantes > 0 ? await fetchExternalRssItems(placesRestantes) : [];
  const urlsConnues = new Set(curated.map((c) => c.lien));
  const combines = [...curated, ...rss.filter((r) => !urlsConnues.has(r.lien))].slice(0, limit);
  return Promise.all(combines.map(traduireEnFrancais));
}
