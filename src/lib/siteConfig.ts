// Configuration clé/valeur minimale pour les vidéos du site (teaser
// homepage, récap hebdo, onboarding) — voir /api/admin/site-config pour la
// mettre à jour. Volontairement simple : pas de CMS, juste une table à 2
// colonnes, largement suffisant pour 2-3 URLs qui changent rarement (et
// une seule, la vidéo hebdo, chaque semaine).

import { requireDb } from './db';

export const CLES_VIDEO = {
  teaser: 'teaser_video_url',
  hebdo: 'weekly_video_url',
  onboarding: 'onboarding_video_url',
} as const;

export async function getSiteConfig(key: string): Promise<string | null> {
  const sql = requireDb();
  const rows = await sql<{ value: string | null }[]>`SELECT value FROM site_config WHERE key = ${key}`;
  return rows[0]?.value ?? null;
}

export async function setSiteConfig(key: string, value: string): Promise<void> {
  const sql = requireDb();
  await sql`
    INSERT INTO site_config (key, value, updated_at) VALUES (${key}, ${value}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
}
