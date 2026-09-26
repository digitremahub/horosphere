// Rapport de fréquentation du site (table page_views, voir lib/kpi.ts) —
// pensé pour être interrogé depuis l'extérieur (analyse ponctuelle ou tâche
// programmée) sans jamais exposer la chaîne de connexion à la base : la
// requête SQL tourne ici, côté serveur, avec DATABASE_URL déjà configurée en
// production. Secret dédié (TRAFFIC_REPORT_SECRET) plutôt que
// SOCIAL_AUTOMATION_SECRET : cette route est en lecture seule et ne devrait
// pas partager son accès avec les automatisations Make qui, elles, publient
// du contenu.
//
// ?date=YYYY-MM-DD  → détail d'une journée (vues, visiteurs uniques, par page)
// ?days=N           → série jour par jour sur N jours (défaut 30, max 90)
import { NextRequest, NextResponse } from 'next/server';
import { dbConfigured } from '@/lib/db';
import { getRapportTraficJour, getSerieTraficJours } from '@/lib/kpi';

function authorized(req: NextRequest): boolean {
  const secret = process.env.TRAFFIC_REPORT_SECRET;
  if (!secret) return false;
  const parParametre = new URL(req.url).searchParams.get('secret');
  return req.headers.get('x-traffic-report-secret') === secret || parParametre === secret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "La base de données n'est pas configurée." }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  const days = Math.min(Math.max(Number(searchParams.get('days') || 30), 1), 90);

  const [serie, jour] = await Promise.all([
    getSerieTraficJours(days),
    date ? getRapportTraficJour(date) : Promise.resolve(null),
  ]);

  return NextResponse.json({ serie, jour });
}
