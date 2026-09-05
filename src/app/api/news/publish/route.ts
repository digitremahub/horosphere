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
  // Le corps brut est décodé nous-mêmes plutôt que via req.formData() : ce
  // module Make n'envoie pas toujours un en-tête Content-Type que l'API
  // Fetch juge assez strictement conforme pour formData(), qui échoue alors
  // silencieusement (body vide -> 400 "titre et contenu obligatoires" alors
  // que Make avait bien envoyé un article complet).
  const contentType = req.headers.get('content-type') || '';
  let body: Record<string, unknown> = {};
  if (contentType.includes('application/json')) {
    body = await req.json().catch(() => ({}));
  } else {
    const raw = await req.text().catch(() => '');
    if (raw) body = Object.fromEntries(new URLSearchParams(raw).entries());
  }
  const titre = String(body.titre || '').trim();
  const contenu = String(body.contenu || '').trim();
  if (!titre || !contenu) {
    // Diagnostic temporaire (panne "Publication actualités" en 400) : la
    // cause n'est pas confirmée, donc on renvoie ce qui a réellement été
    // reçu plutôt que de deviner davantage. À retirer une fois la panne
    // élucidée — ne doit jamais fuiter en usage normal (titre/contenu
    // présents dans l'immense majorité des appels légitimes).
    return NextResponse.json(
      {
        error: 'Titre et contenu sont obligatoires.',
        debug: { contentType, receivedKeys: Object.keys(body), bodyPreview: JSON.stringify(body).slice(0, 500) },
      },
      { status: 400 }
    );
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
