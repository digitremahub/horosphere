import { NextRequest, NextResponse } from 'next/server';
import { hasValidAutomationSecret } from '@/lib/automationAuth';
import { generateSkyNews } from '@/lib/skyNews';

// Appelée chaque semaine par le scénario Make "Génération actualité du
// ciel" — renvoie un article éditorial sur ce qui se passe réellement dans
// le ciel (lune, événements astronomiques, positions planétaires réelles),
// pas une annonce sur Horosphère. Make crée le brouillon correspondant
// dans la table Airtable "Actualités" ; publication après relecture du
// community manager (statut "✅ Publier"), comme pour les réseaux sociaux.
export async function POST(req: NextRequest) {
  if (!hasValidAutomationSecret(req)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  try {
    const draft = await generateSkyNews();
    return NextResponse.json({ ok: true, ...draft });
  } catch (err) {
    console.error('generateSkyNews failed', err);
    return NextResponse.json({ error: "La génération de l'article a échoué." }, { status: 502 });
  }
}
