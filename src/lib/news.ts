// Actualités du ciel — articles centrés sur ce qui se passe réellement dans
// le ciel (lune, événements astronomiques, planètes), générés
// automatiquement chaque semaine (voir lib/skyNews.ts) puis édités/publiés
// par le community manager dans Airtable, via /api/news/publish (appelé
// par un scénario Make.com). Sert la page publique /actualites et
// alimente la newsletter hebdomadaire.

import { requireDb } from './db';

export type NewsItem = {
  id: string;
  slug: string;
  titre: string;
  resume: string;
  contenu: string;
  image_url: string | null;
  publie: boolean;
  publie_le: string | null;
  created_at: string;
  updated_at: string;
};

function slugify(titre: string): string {
  return titre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'actualite';
}

export async function listPublishedNews(limit = 30): Promise<NewsItem[]> {
  const sql = requireDb();
  return sql<NewsItem[]>`
    SELECT * FROM news WHERE publie = true ORDER BY publie_le DESC LIMIT ${limit}
  `;
}

export async function getNewsBySlug(slug: string): Promise<NewsItem | null> {
  const sql = requireDb();
  const rows = await sql<NewsItem[]>`SELECT * FROM news WHERE slug = ${slug} AND publie = true`;
  return rows[0] ?? null;
}

/** Actualités publiées dans les `days` derniers jours — base de la
 * newsletter hebdomadaire. */
export async function getRecentPublishedNews(days = 7): Promise<NewsItem[]> {
  const sql = requireDb();
  return sql<NewsItem[]>`
    SELECT * FROM news
    WHERE publie = true AND publie_le >= now() - (${days} || ' days')::interval
    ORDER BY publie_le DESC
  `;
}

const SIGNES_HEADING = 'Signes les plus concernés cette semaine :';

export type SigneConcerne = { symbole: string; texte: string };
export type ArticleSections = { corps: string; signesConcernes: SigneConcerne[] };

/** Sépare le corps de l'article de la section "Signes les plus concernés"
 * (voir lib/skyNews.ts, qui écrit toujours ce même intitulé) pour pouvoir
 * afficher cette dernière dans son propre encadré plutôt qu'en texte brut
 * au fil du contenu. Les articles publiés avant l'ajout de cette section
 * n'ont simplement pas de `signesConcernes`. */
export function splitArticleSections(contenu: string): ArticleSections {
  const idx = contenu.indexOf(SIGNES_HEADING);
  if (idx === -1) return { corps: contenu, signesConcernes: [] };

  const avant = contenu.slice(0, idx).trim();
  const bloc = contenu.slice(idx + SIGNES_HEADING.length);
  const signesConcernes: SigneConcerne[] = [];
  // Une phrase de clôture suit parfois la liste (ex. "Comme toujours, ces
  // repères ne prédisent rien...") — elle n'a pas sa place dans l'encadré
  // des signes, donc on la récupère pour la remettre à la fin du corps de
  // l'article plutôt que de la perdre.
  const apres: string[] = [];
  for (const ligne of bloc.split('\n')) {
    const trimmed = ligne.trim();
    if (!trimmed) continue;
    const match = /^([♈♉♊♋♌♍♎♏♐♑♒♓])\s*(.+)$/.exec(trimmed);
    if (match) signesConcernes.push({ symbole: match[1], texte: match[2] });
    else apres.push(trimmed);
  }
  const corps = apres.length > 0 ? `${avant}\n\n${apres.join('\n\n')}` : avant;
  return { corps, signesConcernes };
}

/** Publie (ou met à jour) une actualité depuis Airtable. Le slug est fourni
 * par Airtable s'il existe, sinon dérivé du titre. `publie_le` n'est posé
 * qu'à la première publication — une mise à jour de contenu ne change pas
 * la date affichée ni le tri, et n'apparaît pas deux fois dans la
 * newsletter. */
export async function publishNews(opts: { slug?: string; titre: string; resume?: string; contenu: string; imageUrl?: string | null }): Promise<NewsItem> {
  const sql = requireDb();
  const slug = opts.slug?.trim() ? slugify(opts.slug) : slugify(opts.titre);
  const rows = await sql<NewsItem[]>`
    INSERT INTO news (slug, titre, resume, contenu, image_url, publie, publie_le)
    VALUES (${slug}, ${opts.titre}, ${opts.resume ?? ''}, ${opts.contenu}, ${opts.imageUrl ?? null}, true, now())
    ON CONFLICT (slug) DO UPDATE SET
      titre = EXCLUDED.titre,
      resume = EXCLUDED.resume,
      contenu = EXCLUDED.contenu,
      image_url = EXCLUDED.image_url,
      publie = true,
      publie_le = COALESCE(news.publie_le, now()),
      updated_at = now()
    RETURNING *
  `;
  return rows[0];
}
