// KPI du backoffice — demande explicite de l'utilisateur ("Dans le
// backoffice je dois aussi pouvoir suivre les KPI et le nombre de visite
// etc"), restée en attente depuis le début de la conversation. Deux volets :
//
// 1. Fréquentation du site : aucun outil de tracking n'existait (pas de
//    @vercel/analytics, Web Analytics Vercel désactivé sur le projet) — un
//    compteur de vues minimal, maison, est ajouté ici (table `page_views`),
//    alimenté par un beacon client (voir components/VisiteBeacon.tsx +
//    api/track-visit) plutôt que de dépendre d'un service externe à
//    activer/configurer côté utilisateur.
// 2. Croissance/business : réutilise les données déjà en base (utilisateurs,
//    abonnements) pour calculer nouveaux utilisateurs, MRR estimé et taux de
//    conversion — jamais une deuxième source de vérité pour ce qui existe
//    déjà dans lib/admin.ts.

import { requireDb } from './db';
import { SUBSCRIPTIONS } from './pricing';

let pageViewsTableEnsured = false;

async function ensurePageViewsTable(sql: ReturnType<typeof requireDb>): Promise<void> {
  if (pageViewsTableEnsured) return;
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS page_views (
      id BIGSERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      path TEXT NOT NULL,
      visitor_id TEXT NOT NULL
    )
  `);
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS page_views_created_at_idx ON page_views (created_at)`);
  // Colonnes UTM (26/09) — ajoutées après coup, comme `categorie`/`desactive_le`
  // ailleurs dans le backoffice : ALTER TABLE ADD COLUMN IF NOT EXISTS plutôt
  // que de dépendre d'une migration séparée. NULL quand la page vue n'arrive
  // pas d'un lien marqué (navigation interne, visite directe) — voir
  // app/r/[code]/route.ts pour les liens qui les posent, et
  // components/VisiteBeacon.tsx pour leur capture côté client.
  await sql.unsafe(`ALTER TABLE page_views ADD COLUMN IF NOT EXISTS utm_source TEXT`);
  await sql.unsafe(`ALTER TABLE page_views ADD COLUMN IF NOT EXISTS utm_medium TEXT`);
  await sql.unsafe(`ALTER TABLE page_views ADD COLUMN IF NOT EXISTS utm_campaign TEXT`);
  pageViewsTableEnsured = true;
}

export type ParametresUtm = { source?: string | null; medium?: string | null; campaign?: string | null };

/** Enregistre une vue de page — appelée depuis /api/track-visit (voir
 * components/VisiteBeacon.tsx). `visitorId` est un identifiant anonyme tiré
 * d'un cookie (aucune donnée personnelle) : sert uniquement à distinguer
 * visiteurs uniques et vues de page, jamais à identifier quelqu'un. `utm`
 * n'est renseigné que sur la page d'atterrissage d'un lien marqué (voir
 * ParametresUtm) — les navigations internes suivantes n'en portent pas,
 * c'est attendu. Ne lève jamais d'erreur bloquante : une vue manquée n'est
 * jamais grave. */
export async function enregistrerVisite(path: string, visitorId: string, utm: ParametresUtm = {}): Promise<void> {
  const sql = requireDb();
  await ensurePageViewsTable(sql);
  await sql`
    INSERT INTO page_views (path, visitor_id, utm_source, utm_medium, utm_campaign)
    VALUES (
      ${path.slice(0, 300)}, ${visitorId.slice(0, 100)},
      ${utm.source?.slice(0, 100) ?? null}, ${utm.medium?.slice(0, 100) ?? null}, ${utm.campaign?.slice(0, 100) ?? null}
    )
  `;
}

export type VisitesResume = {
  vuesAujourdHui: number;
  vuesSur7j: number;
  vuesSur30j: number;
  visiteursUniques7j: number;
  visiteursUniques30j: number;
  // Vues par jour, sur les 14 derniers jours (le plus ancien en premier) —
  // sert à dessiner une mini-tendance dans le backoffice sans dépendance à
  // une librairie de graphiques.
  serie14j: { jour: string; vues: number }[];
};

async function getVisitesResume(sql: ReturnType<typeof requireDb>): Promise<VisitesResume> {
  await ensurePageViewsTable(sql);

  const [{ count: vuesAujourdHui }] = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count FROM page_views WHERE created_at >= date_trunc('day', now())
  `;
  const [{ count: vuesSur7j }] = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count FROM page_views WHERE created_at >= now() - interval '7 days'
  `;
  const [{ count: vuesSur30j }] = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count FROM page_views WHERE created_at >= now() - interval '30 days'
  `;
  const [{ count: visiteursUniques7j }] = await sql<{ count: string }[]>`
    SELECT COUNT(DISTINCT visitor_id)::text AS count FROM page_views WHERE created_at >= now() - interval '7 days'
  `;
  const [{ count: visiteursUniques30j }] = await sql<{ count: string }[]>`
    SELECT COUNT(DISTINCT visitor_id)::text AS count FROM page_views WHERE created_at >= now() - interval '30 days'
  `;
  const serie = await sql<{ jour: string; vues: string }[]>`
    SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS jour, COUNT(*)::text AS vues
    FROM page_views
    WHERE created_at >= now() - interval '14 days'
    GROUP BY 1
    ORDER BY 1
  `;
  const parJour = new Map(serie.map((r) => [r.jour, Number(r.vues)]));
  const serie14j: { jour: string; vues: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const jour = d.toISOString().slice(0, 10);
    serie14j.push({ jour, vues: parJour.get(jour) ?? 0 });
  }

  return {
    vuesAujourdHui: Number(vuesAujourdHui),
    vuesSur7j: Number(vuesSur7j),
    vuesSur30j: Number(vuesSur30j),
    visiteursUniques7j: Number(visiteursUniques7j),
    visiteursUniques30j: Number(visiteursUniques30j),
    serie14j,
  };
}

export type RapportTraficJour = {
  jour: string;
  vues: number;
  visiteursUniques: number;
  parChemin: { path: string; vues: number }[];
  parCampagne: { source: string; campagne: string; vues: number }[];
};

/** Détail d'une journée précise — voir api/admin/traffic-report : sert à
 * comprendre un pic de fréquentation repéré dans getSerieTraficJours, en
 * répartissant les vues par page et par campagne UTM (voir
 * app/r/[code]/route.ts pour la pose de ces paramètres). */
export async function getRapportTraficJour(jour: string): Promise<RapportTraficJour> {
  const sql = requireDb();
  await ensurePageViewsTable(sql);
  const [[{ count: vues }], [{ count: visiteursUniques }], parChemin, parCampagne] = await Promise.all([
    sql<{ count: string }[]>`
      SELECT COUNT(*)::text AS count FROM page_views
      WHERE created_at >= ${jour}::date AND created_at < ${jour}::date + interval '1 day'
    `,
    sql<{ count: string }[]>`
      SELECT COUNT(DISTINCT visitor_id)::text AS count FROM page_views
      WHERE created_at >= ${jour}::date AND created_at < ${jour}::date + interval '1 day'
    `,
    sql<{ path: string; count: string }[]>`
      SELECT path, COUNT(*)::text AS count FROM page_views
      WHERE created_at >= ${jour}::date AND created_at < ${jour}::date + interval '1 day'
      GROUP BY path ORDER BY COUNT(*) DESC LIMIT 30
    `,
    sql<{ source: string; campagne: string; count: string }[]>`
      SELECT COALESCE(utm_source, '(aucun)') AS source, COALESCE(utm_campaign, '(aucune)') AS campagne, COUNT(*)::text AS count
      FROM page_views
      WHERE created_at >= ${jour}::date AND created_at < ${jour}::date + interval '1 day'
        AND utm_source IS NOT NULL
      GROUP BY 1, 2 ORDER BY COUNT(*) DESC LIMIT 30
    `,
  ]);
  return {
    jour,
    vues: Number(vues),
    visiteursUniques: Number(visiteursUniques),
    parChemin: parChemin.map((r) => ({ path: r.path, vues: Number(r.count) })),
    parCampagne: parCampagne.map((r) => ({ source: r.source, campagne: r.campagne, vues: Number(r.count) })),
  };
}

export type PointSerieTrafic = { jour: string; vues: number; visiteursUniques: number };

/** Série jour par jour sur `joursN` jours — sert à repérer un pic (comparaison
 * à la moyenne des jours voisins) avant d'aller chercher le détail par page
 * avec getRapportTraficJour. */
export async function getSerieTraficJours(joursN = 30): Promise<PointSerieTrafic[]> {
  const sql = requireDb();
  await ensurePageViewsTable(sql);
  const rows = await sql<{ jour: string; vues: string; visiteurs: string }[]>`
    SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS jour,
           COUNT(*)::text AS vues,
           COUNT(DISTINCT visitor_id)::text AS visiteurs
    FROM page_views
    WHERE created_at >= now() - (${joursN} || ' days')::interval
    GROUP BY 1
    ORDER BY 1
  `;
  const parJour = new Map(rows.map((r) => [r.jour, { vues: Number(r.vues), visiteurs: Number(r.visiteurs) }]));
  const serie: PointSerieTrafic[] = [];
  for (let i = joursN - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const jour = d.toISOString().slice(0, 10);
    const v = parJour.get(jour);
    serie.push({ jour, vues: v?.vues ?? 0, visiteursUniques: v?.visiteurs ?? 0 });
  }
  return serie;
}

export type Kpis = {
  visites: VisitesResume;
  utilisateurs: { total: number; nouveaux7j: number; nouveaux30j: number };
  abonnements: { actifs: number; mrrCentimes: number; parPlan: { plan_slug: string; count: number }[] };
  tauxConversionPourcent: number;
};

const PRIX_PAR_PLAN = new Map(SUBSCRIPTIONS.map((s) => [s.slug, s.prixCentimesParMois]));

/** Vue d'ensemble du backoffice — fréquentation + croissance + business, un
 * seul appel pour toute la page KPI (voir app/admin/kpi/page.tsx). */
export async function getKpis(): Promise<Kpis> {
  const sql = requireDb();

  const [visites, [{ count: totalUsers }], [{ count: nouveaux7j }], [{ count: nouveaux30j }], parPlanActifs] = await Promise.all([
    getVisitesResume(sql),
    sql<{ count: string }[]>`SELECT COUNT(*)::text AS count FROM users`,
    sql<{ count: string }[]>`SELECT COUNT(*)::text AS count FROM profiles WHERE created_at >= now() - interval '7 days'`,
    sql<{ count: string }[]>`SELECT COUNT(*)::text AS count FROM profiles WHERE created_at >= now() - interval '30 days'`,
    // MRR estimé sur les abonnements réellement actifs (hors essai en cours,
    // pas encore facturé) — volontairement distinct du compteur "abonnés
    // actifs" du reste du backoffice (actif + essai) pour ne pas surestimer
    // le revenu récurrent.
    sql<{ plan_slug: string; count: string }[]>`
      SELECT plan_slug, COUNT(*)::text AS count FROM subscriptions WHERE status = 'active' GROUP BY plan_slug
    `,
  ]);

  const parPlan = parPlanActifs.map((r) => ({ plan_slug: r.plan_slug, count: Number(r.count) }));
  const mrrCentimes = parPlan.reduce((total, r) => total + r.count * (PRIX_PAR_PLAN.get(r.plan_slug) ?? 0), 0);
  const actifs = parPlan.reduce((total, r) => total + r.count, 0);
  const total = Number(totalUsers);

  return {
    visites,
    utilisateurs: { total, nouveaux7j: Number(nouveaux7j), nouveaux30j: Number(nouveaux30j) },
    abonnements: { actifs, mrrCentimes, parPlan },
    tauxConversionPourcent: total > 0 ? Math.round((actifs / total) * 1000) / 10 : 0,
  };
}
