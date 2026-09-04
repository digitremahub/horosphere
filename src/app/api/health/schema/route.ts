// Diagnostic minimal, sans donnée sensible (juste des booléens) — vérifie
// que le schéma db/schema.sql a bien été rejoué sur la base connectée.
// Utile car il n'y a pas de migrateur automatique : chaque ajout de
// colonne/table nécessite de relancer schema.sql manuellement sur Neon,
// et cet endpoint permet de le confirmer sans avoir à se connecter à psql.

import { NextResponse } from 'next/server';
import { dbConfigured, sql } from '@/lib/db';

export async function GET() {
  if (!dbConfigured || !sql) {
    return NextResponse.json({ dbConfigured: false });
  }

  const rows = await sql<{ table_name: string; column_name: string }[]>`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE (table_name = 'users' AND column_name = 'password_hash')
       OR (table_name = 'profiles' AND column_name = 'newsletter_opt_in')
       OR (table_name = 'news' AND column_name = 'slug')
  `;
  const has = (table: string, column: string) => rows.some((r) => r.table_name === table && r.column_name === column);

  return NextResponse.json({
    dbConfigured: true,
    users_password_hash: has('users', 'password_hash'),
    profiles_newsletter_opt_in: has('profiles', 'newsletter_opt_in'),
    news_table: has('news', 'slug'),
  });
}
