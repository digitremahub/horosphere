import { NextRequest, NextResponse } from 'next/server';
import { verifyUnsubscribeToken, setNewsletterOptIn } from '@/lib/newsletter';
import { dbConfigured } from '@/lib/db';

// Lien de désabonnement présent dans chaque newsletter — volontairement
// sans connexion requise (jeton signé dans l'URL), comme l'exige un
// désabonnement en un clic.
export async function GET(req: NextRequest) {
  const uid = Number(req.nextUrl.searchParams.get('uid'));
  const token = req.nextUrl.searchParams.get('token') || '';

  if (!uid || !token || !verifyUnsubscribeToken(uid, token)) {
    return NextResponse.json({ error: 'Lien de désabonnement invalide.' }, { status: 400 });
  }
  if (!dbConfigured) {
    return NextResponse.json({ error: "La base de données n'est pas configurée." }, { status: 503 });
  }

  try {
    await setNewsletterOptIn(uid, false);
  } catch (err) {
    console.error('setNewsletterOptIn failed', err);
    return NextResponse.json({ error: 'La désinscription a échoué.' }, { status: 500 });
  }

  return new NextResponse(
    '<!doctype html><html lang="fr"><body style="font-family:Arial,sans-serif;padding:40px;text-align:center;"><h1>Désabonnement confirmé</h1><p>Vous ne recevrez plus la newsletter Horosphère. Vous pouvez vous réabonner à tout moment depuis votre profil.</p></body></html>',
    { headers: { 'content-type': 'text/html; charset=utf-8' } }
  );
}
