// Route de diagnostic TEMPORAIRE — encode en base64 le contenu d'une URL
// interne pour permettre une vérification visuelle depuis un environnement
// de développement sans accès sortant direct au domaine de production
// (même contrainte que les autres routes GET+secret de ce dossier).
// À supprimer une fois la vérification terminée.
import { NextRequest, NextResponse } from 'next/server';
import { hasValidAutomationSecret } from '@/lib/automationAuth';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bySecretParam = searchParams.get('secret');
  const authorized = hasValidAutomationSecret(req) || (!!bySecretParam && bySecretParam === process.env.SOCIAL_AUTOMATION_SECRET);
  if (!authorized) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });

  const path = searchParams.get('path');
  if (!path || !path.startsWith('/')) {
    return NextResponse.json({ error: "Paramètre 'path' requis (doit commencer par /)." }, { status: 400 });
  }

  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://horosphere.fr').replace(/\/$/, '');
  try {
    const res = await fetch(`${base}${path}`, { cache: 'no-store' });
    const buffer = Buffer.from(await res.arrayBuffer());
    return NextResponse.json({
      ok: true,
      status: res.status,
      contentType: res.headers.get('content-type'),
      size: buffer.length,
      base64: buffer.toString('base64'),
    });
  } catch (err) {
    return NextResponse.json({ error: 'Récupération échouée.', detail: String(err) }, { status: 502 });
  }
}
