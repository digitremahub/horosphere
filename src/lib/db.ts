import postgres from 'postgres';

// Une seule connexion réutilisée entre les invocations de fonctions (utile en
// dev ; sur Vercel chaque instance serverless en crée une, c'est normal).
// `prepare: false` évite les soucis avec les connexions "pooled" type
// PgBouncer que Neon utilise par défaut — sans ça certaines requêtes
// échouent silencieusement en production.

declare global {
  // eslint-disable-next-line no-var
  var __horosphereSql: ReturnType<typeof postgres> | undefined;
}

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return null;
  }
  return postgres(url, { prepare: false, ssl: 'require' });
}

export const sql = globalThis.__horosphereSql ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__horosphereSql = sql ?? undefined;
}

export function requireDb(): ReturnType<typeof postgres> {
  if (!sql) {
    throw new Error(
      "DATABASE_URL n'est pas configurée. Ajoute une base Postgres (onglet Storage du projet Vercel, ou Neon) puis redéploie."
    );
  }
  return sql;
}

export const dbConfigured = Boolean(process.env.DATABASE_URL);
