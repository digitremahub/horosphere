// Applique les statements DDL en attente (voir db/schema.sql) directement en
// production — sans ça, chaque nouvelle table nécessite d'avoir `psql` et
// DATABASE_URL sous la main (personne ici n'a accès à cette variable en
// clair : ni Claude, ni un scénario Make). Chaque statement est idempotent
// (CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS), donc rejouer ce
// endpoint plusieurs fois ne fait jamais de mal. Protégé par le même secret
// que les autres routes d'automatisation.
//
// Pas un remplacement de db/schema.sql (qui reste la référence complète,
// à jour) : au fur et à mesure des sessions, on ajoute ici seulement les
// statements pas encore confirmés appliqués via /api/health/schema.

import { NextRequest, NextResponse } from 'next/server';
import { hasValidAutomationSecret } from '@/lib/automationAuth';
import { requireDb, dbConfigured } from '@/lib/db';

const PENDING_STATEMENTS: { name: string; sql: string }[] = [
  {
    name: 'news_translations',
    sql: `CREATE TABLE IF NOT EXISTS news_translations (
      news_id UUID NOT NULL REFERENCES news(id) ON DELETE CASCADE,
      locale TEXT NOT NULL,
      titre TEXT,
      resume TEXT,
      contenu TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (news_id, locale)
    )`,
  },
  {
    // Ponctuel : un mot anglais ("Meanwhile,") s'était glissé dans le
    // contenu français généré par l'IA (skyNews.ts) pour cet article — déjà
    // corrigé côté Airtable, corrigé ici côté Postgres (source réellement
    // servie par le site). Sans WHERE contenu LIKE, ce statement ne
    // toucherait plus rien après le premier passage : rejouable sans risque.
    name: 'fix-meanwhile-42051efc',
    sql: `UPDATE news SET contenu = replace(contenu, 'Meanwhile, la Lune', 'Pendant ce temps, la Lune')
      WHERE id = '42051efc-5937-459a-8b02-7c121f3751d6' AND contenu LIKE '%Meanwhile, la Lune%'`,
  },
  {
    // Ponctuel : deux articles quasi-identiques (même angle "Saturne
    // rétrograde") publiés à un jour d'intervalle début septembre — tous
    // deux issus de déclenchements manuels pendant la mise au point du
    // scénario Make (voir executions_list : le cron hebdomadaire lui-même
    // n'a jamais tourné à cette date), pas d'un vrai doublon de contenu.
    // On dépublie le plus ancien (slug 'saturne-retrograde-ralentir-pour-structurer')
    // et on garde celui du 5 septembre, déjà relu et dont les traductions
    // EN/ES fonctionnent. WHERE publie = true : sans effet si déjà dépublié.
    name: 'unpublish-duplicate-saturne-4-sept',
    sql: `UPDATE news SET publie = false
      WHERE slug = 'saturne-retrograde-ralentir-pour-structurer' AND publie = true`,
  },
  {
    name: 'horoscope_email_opt_in',
    sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS horoscope_email_opt_in BOOLEAN NOT NULL DEFAULT false`,
  },
  {
    name: 'social_posts',
    sql: `CREATE TABLE IF NOT EXISTS social_posts (
      id SERIAL PRIMARY KEY,
      airtable_id TEXT NOT NULL UNIQUE,
      platform TEXT NOT NULL,
      image_url TEXT,
      caption TEXT NOT NULL DEFAULT '',
      hashtags TEXT,
      publie_le TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
  },
  {
    name: 'idx_social_posts_publie_le',
    sql: `CREATE INDEX IF NOT EXISTS idx_social_posts_publie_le ON social_posts (publie_le DESC)`,
  },
  {
    name: 'birthday_refunds',
    sql: `CREATE TABLE IF NOT EXISTS birthday_refunds (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      stripe_refund_id TEXT,
      amount_cents INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, year)
    )`,
  },
  {
    name: 'advent_claims',
    sql: `CREATE TABLE IF NOT EXISTS advent_claims (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      day INTEGER NOT NULL,
      credits INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, year, day)
    )`,
  },
];

async function runPending(req: NextRequest): Promise<NextResponse> {
  // Accepte le secret en en-tête (Make) ou en paramètre `secret` (déclenché
  // à la main via un simple GET, ex. depuis un outil qui ne pose pas
  // d'en-têtes personnalisés) — même secret, deux façons de le présenter.
  const bySecretParam = new URL(req.url).searchParams.get('secret');
  const authorized = hasValidAutomationSecret(req) || (!!bySecretParam && bySecretParam === process.env.SOCIAL_AUTOMATION_SECRET);
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  if (!dbConfigured) {
    return NextResponse.json({ error: "La base de données n'est pas configurée." }, { status: 503 });
  }

  const sql = requireDb();
  const applied: string[] = [];
  const failed: { name: string; error: string }[] = [];
  for (const stmt of PENDING_STATEMENTS) {
    try {
      await sql.unsafe(stmt.sql);
      applied.push(stmt.name);
    } catch (err) {
      failed.push({ name: stmt.name, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return NextResponse.json({ applied, failed });
}

export async function POST(req: NextRequest) {
  return runPending(req);
}

export async function GET(req: NextRequest) {
  return runPending(req);
}
