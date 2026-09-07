// Publications réseaux sociaux réellement publiées — copie écrite par le
// scénario Make "Publication réseaux sociaux (posts approuvés)" juste après
// chaque publication réussie sur Facebook/Instagram (voir
// /api/social/record-published). Alimente uniquement le carrousel de la
// page d'accueil : la source de vérité éditoriale reste Airtable.

import { requireDb } from './db';

export type SocialPost = {
  id: number;
  airtable_id: string;
  platform: string;
  image_url: string | null;
  caption: string;
  hashtags: string | null;
  publie_le: string;
  created_at: string;
};

/** Les `limit` publications les plus récentes, images uniquement (un
 * carrousel sans visuel n'a pas de sens) — se renouvelle naturellement
 * chaque jour au fil des nouvelles publications, sans logique d'archivage
 * à maintenir. */
export async function listRecentSocialPosts(limit = 12): Promise<SocialPost[]> {
  const sql = requireDb();
  return sql<SocialPost[]>`
    SELECT * FROM social_posts
    WHERE image_url IS NOT NULL AND image_url != ''
    ORDER BY publie_le DESC
    LIMIT ${limit}
  `;
}

/** Enregistre (ou met à jour) une publication tout juste publiée.
 * `airtableId` rend l'appel idempotent : un ré-appel accidentel du même
 * scénario Make met juste à jour la même ligne au lieu d'en créer une
 * deuxième. */
export async function recordPublishedSocialPost(opts: {
  airtableId: string;
  platform: string;
  imageUrl?: string | null;
  caption: string;
  hashtags?: string | null;
}): Promise<SocialPost> {
  const sql = requireDb();
  const rows = await sql<SocialPost[]>`
    INSERT INTO social_posts (airtable_id, platform, image_url, caption, hashtags, publie_le)
    VALUES (${opts.airtableId}, ${opts.platform}, ${opts.imageUrl ?? null}, ${opts.caption}, ${opts.hashtags ?? null}, now())
    ON CONFLICT (airtable_id) DO UPDATE SET
      platform = EXCLUDED.platform,
      image_url = EXCLUDED.image_url,
      caption = EXCLUDED.caption,
      hashtags = EXCLUDED.hashtags
    RETURNING *
  `;
  return rows[0];
}
