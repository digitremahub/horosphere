// Actualités Horosphère — éditées par le community manager dans Airtable,
// publiées ici via /api/news/publish (appelé par un scénario Make.com).
// Sert la page publique /actualites et alimente la newsletter hebdomadaire.

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
