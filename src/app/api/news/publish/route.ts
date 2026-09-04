import { NextRequest, NextResponse } from 'next/server';
import { hasValidAutomationSecret } from '@/lib/automationAuth';
import { publishNews } from '@/lib/news';
import { dbConfigured } from '@/lib/db';

// Appelée par le scénario Make.com "Publication actualités" quand une ligne
// Airtable (table Actualités) passe au statut "Publier" — écrit ou met à
// jour l'article dans la table `news`, visible aussitôt sur /actualites et
// repris par la newsletter hebdomadaire suivante.
export async function POST(req: NextRequest) {
  if (!hasValidAutomationSecret(req)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  if (!dbConfigured) {
    return NextResponse.json({ error: "La base de données n'est pas configurée." }, { status: 503 });
  }

  // Accepte JSON ou x-www-form-urlencoded (Make envoie ce dernier pour
  // éviter l'échappement JSON manuel sur des champs Airtable en texte libre).
  const contentType = req.headers.get('content-type') || '';
  let body: Record<string, unknown> = {};
  if (contentType.includes('application/json')) {
    body = await req.json().catch(() => ({}));
  } else {
    const form = await req.formData().catch(() => null);
    if (form) body = Object.fromEntries(form.entries());
  }
  const titre = String(body.titre || '').trim();
  const contenu = String(body.contenu || '').trim();
  if (!titre || !contenu) {
    return NextResponse.json({ error: 'Titre et contenu sont obligatoires.' }, { status: 400 });
  }

  try {
    const news = await publishNews({
      slug: typeof body.slug === 'string' ? body.slug : undefined,
      titre,
      resume: typeof body.resume === 'string' ? body.resume : undefined,
      contenu,
      imageUrl: typeof body.imageUrl === 'string' ? body.imageUrl : null,
    });
    return NextResponse.json({ ok: true, news });
  } catch (err) {
    console.error('publishNews failed', err);
    return NextResponse.json({ error: 'La publication a échoué.' }, { status: 500 });
  }
}
