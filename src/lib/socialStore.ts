// Persistance des posts réseaux sociaux générés (table social_posts,
// voir db/schema.sql). Cycle de vie : brouillon -> approuve|rejete -> publie.

import { requireDb } from './db';
import type { DailySocialContent, SocialDraft } from './social';

export type Plateforme = 'instagram' | 'facebook' | 'tiktok';
export type Statut = 'brouillon' | 'approuve' | 'rejete' | 'publie';

export type SocialPost = {
  id: string;
  post_date: string;
  plateforme: Plateforme;
  statut: Statut;
  legende: string;
  hashtags: string;
  image_url: string | null;
  script_video: string | null;
  mode: 'ia' | 'demo';
  publie_le: string | null;
  created_at: string;
  updated_at: string;
};

const PLATEFORMES: Plateforme[] = ['instagram', 'facebook', 'tiktok'];

/** Enregistre le contenu généré pour une date donnée. N'écrase jamais un
 * post déjà approuvé, rejeté ou publié — seule une ligne encore au statut
 * "brouillon" est mise à jour si on régénère le même jour. */
export async function saveDailyDrafts(postDate: string, content: DailySocialContent): Promise<void> {
  const sql = requireDb();
  for (const plateforme of PLATEFORMES) {
    const draft: SocialDraft = content[plateforme];
    await sql`
      INSERT INTO social_posts (post_date, plateforme, legende, hashtags, image_url, script_video, mode)
      VALUES (${postDate}, ${plateforme}, ${draft.legende}, ${draft.hashtags}, ${draft.imageUrl}, ${draft.scriptVideo}, ${draft.mode})
      ON CONFLICT (post_date, plateforme) DO UPDATE SET
        legende = EXCLUDED.legende,
        hashtags = EXCLUDED.hashtags,
        image_url = EXCLUDED.image_url,
        script_video = EXCLUDED.script_video,
        mode = EXCLUDED.mode,
        updated_at = now()
      WHERE social_posts.statut = 'brouillon'
    `;
  }
}

export async function listPosts(opts: { statut?: Statut; limit?: number } = {}): Promise<SocialPost[]> {
  const sql = requireDb();
  const limit = opts.limit ?? 30;
  if (opts.statut) {
    return sql<SocialPost[]>`
      SELECT * FROM social_posts WHERE statut = ${opts.statut} ORDER BY post_date DESC, plateforme ASC LIMIT ${limit}
    `;
  }
  return sql<SocialPost[]>`
    SELECT * FROM social_posts ORDER BY post_date DESC, plateforme ASC LIMIT ${limit}
  `;
}

export async function getPost(id: string): Promise<SocialPost | null> {
  const sql = requireDb();
  const rows = await sql<SocialPost[]>`SELECT * FROM social_posts WHERE id = ${id}`;
  return rows[0] ?? null;
}

export async function setStatut(id: string, statut: Statut): Promise<SocialPost | null> {
  const sql = requireDb();
  const rows = await sql<SocialPost[]>`
    UPDATE social_posts SET statut = ${statut}, updated_at = now() WHERE id = ${id} RETURNING *
  `;
  return rows[0] ?? null;
}

export async function markPublished(id: string): Promise<SocialPost | null> {
  const sql = requireDb();
  const rows = await sql<SocialPost[]>`
    UPDATE social_posts SET statut = 'publie', publie_le = now(), updated_at = now() WHERE id = ${id} RETURNING *
  `;
  return rows[0] ?? null;
}
