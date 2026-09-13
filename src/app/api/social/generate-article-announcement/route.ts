// Annonce Instagram d'un nouvel article "actualité du ciel" — appelée par
// le scénario Make "Publication actualités" juste après /api/news/publish,
// pour créer (et publier) le post qui renvoie les abonnés vers la page
// actualités. Demande explicite de l'utilisateur (13/09) : l'article doit
// aussi être annoncé sur Instagram, avec un visuel dédié — voir
// api/og/annonce-article/route.tsx pour le visuel lui-même.
import { NextRequest, NextResponse } from 'next/server';
import { hasValidAutomationSecret } from '@/lib/automationAuth';
import { siteUrl } from '@/lib/social';

const HASHTAGS = '#horoscope #astrologie #horosphere #actualiteduciel #developpementpersonnel';

export async function POST(req: NextRequest) {
  if (!hasValidAutomationSecret(req)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const titre = String(body.titre || '').trim();
  const resume = String(body.resume || '').trim();
  if (!titre) {
    return NextResponse.json({ error: 'Paramètre titre requis.' }, { status: 400 });
  }

  // Instagram n'autorise aucun lien cliquable dans une légende de post
  // (contrairement aux stories) : l'URL est donc affichée en clair, comme
  // sur le visuel — jamais promise comme cliquable dans le texte.
  const legende = [
    `📰 ${titre}`,
    '',
    ...(resume ? [resume, ''] : []),
    `L'article complet est en ligne sur horosphere.fr, section Actualités.`,
    `🔗 horosphere.fr/actualites`,
  ].join('\n');

  const imageUrl = `${siteUrl()}/api/og/annonce-article?titre=${encodeURIComponent(titre)}`;

  return NextResponse.json({ ok: true, legende, hashtags: HASHTAGS, imageUrl });
}
