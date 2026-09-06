import { NextRequest, NextResponse } from 'next/server';
import { hasValidAutomationSecret } from '@/lib/automationAuth';
import { genererReelDuJour, genererRecapDimanche } from '@/lib/reels';

// Appelée par Make deux fois par jour (matin/après-midi, lundi-samedi) et
// une fois le dimanche (récap) — soumet le rendu vidéo du reel du jour
// (Shotstack pour un signe, HeyGen pour le récap dominical) et renvoie
// l'identifiant à surveiller via /api/social/reel-status. Ne stocke rien
// côté app : comme pour /api/social/generate, c'est Make qui écrit le
// brouillon dans Airtable une fois le rendu terminé.
export async function POST(req: NextRequest) {
  if (!hasValidAutomationSecret(req)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const dateISO = typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : new Date().toISOString().slice(0, 10);
  const creneau = body.creneau;
  if (creneau !== 'matin' && creneau !== 'apres-midi' && creneau !== 'recap') {
    return NextResponse.json({ error: "Paramètre 'creneau' invalide (attendu : matin, apres-midi ou recap)." }, { status: 400 });
  }

  try {
    const date = new Date(dateISO);
    const resultat = creneau === 'recap' ? await genererRecapDimanche(date) : await genererReelDuJour(date, creneau);
    if (!resultat) {
      return NextResponse.json({ error: "Pas de reel signe-par-signe ce jour-là (dimanche = 'recap')." }, { status: 400 });
    }
    return NextResponse.json({ ok: true, date: dateISO, creneau, ...resultat });
  } catch (err) {
    console.error('generate-reel failed', err);
    return NextResponse.json({ error: 'La génération du reel a échoué.' }, { status: 502 });
  }
}
