import { NextRequest, NextResponse } from 'next/server';
import { hasValidAutomationSecret } from '@/lib/automationAuth';
import { sendDailyHoroscopeEmails } from '@/lib/dailyHoroscopeEmail';
import { dbConfigured } from '@/lib/db';

// Appelée chaque matin par un scénario Make.com — envoie l'horoscope du
// jour aux utilisateurs ayant coché l'envoi quotidien dans leur profil
// (voir lib/dailyHoroscopeEmail.ts), avec déduction d'un crédit par envoi
// réussi.
async function handle() {
  if (!dbConfigured) {
    return NextResponse.json({ error: "La base de données n'est pas configurée." }, { status: 503 });
  }
  try {
    const result = await sendDailyHoroscopeEmails();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('sendDailyHoroscopeEmails failed', err);
    return NextResponse.json({ error: "L'envoi de l'horoscope quotidien a échoué." }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  if (!hasValidAutomationSecret(req)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  return handle();
}

// GET + secret en paramètre : même besoin que les autres routes
// d'automatisation (voir /api/admin/schema-sync) — cette session de
// développement n'a pas d'accès sortant direct au domaine de production.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bySecretParam = searchParams.get('secret');
  const authorized = hasValidAutomationSecret(req) || (!!bySecretParam && bySecretParam === process.env.SOCIAL_AUTOMATION_SECRET);
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  return handle();
}
