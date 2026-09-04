import { NextRequest, NextResponse } from 'next/server';
import { hasValidAutomationSecret } from '@/lib/automationAuth';
import { sendWeeklyNewsletter } from '@/lib/newsletter';
import { dbConfigured } from '@/lib/db';

// Appelée une fois par semaine par un scénario Make.com — envoie la
// newsletter à tous les utilisateurs inscrits (non désabonnés) à partir des
// actualités publiées dans les 7 derniers jours. N'envoie rien si aucune
// actualité n'a été publiée cette semaine.
export async function POST(req: NextRequest) {
  if (!hasValidAutomationSecret(req)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  if (!dbConfigured) {
    return NextResponse.json({ error: "La base de données n'est pas configurée." }, { status: 503 });
  }

  try {
    const result = await sendWeeklyNewsletter();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('sendWeeklyNewsletter failed', err);
    return NextResponse.json({ error: "L'envoi de la newsletter a échoué." }, { status: 502 });
  }
}
