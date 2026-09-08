// Génère ET soumet le récap hebdomadaire Elian/Lya pour une semaine
// donnée : calcule les faits réels (lib/weeklyHighlight.ts), en tire un
// script (lib/recapHebdo.ts, IA + repli déterministe), puis soumet à
// HeyGen (lib/heygen.ts, soumettreRecapDuo). Remplace la route ponctuelle
// /api/admin/heygen-recap-hebdo (script écrit à la main pour une seule
// semaine) par un point d'entrée permanent, réutilisable chaque semaine.

import { NextRequest, NextResponse } from 'next/server';
import { hasValidAutomationSecret } from '@/lib/automationAuth';
import { getWeeklyHighlight } from '@/lib/weeklyHighlight';
import { genererScriptRecapHebdo } from '@/lib/recapHebdo';
import { soumettreRecapDuo } from '@/lib/heygen';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bySecretParam = searchParams.get('secret');
  const authorized = hasValidAutomationSecret(req) || (!!bySecretParam && bySecretParam === process.env.SOCIAL_AUTOMATION_SECRET);
  if (!authorized) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });

  const debut = searchParams.get('debut');
  const fin = searchParams.get('fin');
  if (!debut || !fin || !/^\d{4}-\d{2}-\d{2}$/.test(debut) || !/^\d{4}-\d{2}-\d{2}$/.test(fin)) {
    return NextResponse.json({ error: "Paramètres 'debut' et 'fin' requis (YYYY-MM-DD)." }, { status: 400 });
  }
  if (!process.env.HEYGEN_API_KEY) {
    return NextResponse.json({ error: 'HEYGEN_API_KEY non configurée.' }, { status: 500 });
  }

  try {
    const highlight = getWeeklyHighlight(debut, fin);
    const { format, scenes } = await genererScriptRecapHebdo(highlight);
    const videoId = await soumettreRecapDuo(scenes);
    return NextResponse.json({ ok: true, videoId, format, scenes, highlight });
  } catch (err) {
    console.error('recap-hebdo failed', err);
    return NextResponse.json({ error: 'Génération ou soumission échouée.', detail: String(err) }, { status: 502 });
  }
}
