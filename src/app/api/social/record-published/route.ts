import { NextRequest, NextResponse } from 'next/server';
import { hasValidAutomationSecret } from '@/lib/automationAuth';
import { recordPublishedSocialPost } from '@/lib/socialPosts';
import { dbConfigured } from '@/lib/db';

async function handle(body: Record<string, unknown>) {
  if (!dbConfigured) {
    return NextResponse.json({ error: "La base de données n'est pas configurée." }, { status: 503 });
  }
  const airtableId = String(body.airtableId || '').trim();
  const platform = String(body.platform || '').trim();
  const caption = String(body.caption || '').trim();
  if (!airtableId || !platform) {
    return NextResponse.json({ error: 'airtableId et platform sont obligatoires.' }, { status: 400 });
  }

  try {
    const post = await recordPublishedSocialPost({
      airtableId,
      platform,
      caption,
      imageUrl: typeof body.imageUrl === 'string' ? body.imageUrl : null,
      hashtags: typeof body.hashtags === 'string' ? body.hashtags : null,
    });
    return NextResponse.json({ ok: true, post });
  } catch (err) {
    console.error('recordPublishedSocialPost failed', err);
    return NextResponse.json({ error: "L'enregistrement a échoué." }, { status: 500 });
  }
}

// Appelée par le scénario Make "Publication réseaux sociaux (posts
// approuvés)" juste après chaque publication réussie sur Facebook/Instagram
// — copie le post dans Postgres pour alimenter le carrousel de la page
// d'accueil (Airtable reste la source de vérité éditoriale, mais l'app n'y
// a pas d'accès direct en lecture).
export async function POST(req: NextRequest) {
  if (!hasValidAutomationSecret(req)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  // Accepte JSON ou x-www-form-urlencoded (même raison que
  // /api/news/publish : les légendes contiennent des sauts de ligne, que
  // Make sérialise proprement en formulaire plutôt que de risquer un JSON
  // mal échappé si on l'écrivait à la main dans le corps de la requête).
  const contentType = req.headers.get('content-type') || '';
  let body: Record<string, unknown> = {};
  if (contentType.includes('application/json')) {
    body = await req.json().catch(() => ({}));
  } else {
    const raw = await req.text().catch(() => '');
    if (raw) body = Object.fromEntries(new URLSearchParams(raw).entries());
  }
  return handle(body);
}

// GET + secret en paramètre : même besoin que les autres routes
// d'automatisation (voir /api/social/generate-reel) — utile ici pour
// rattraper à la main une publication déjà partie avant la mise en place du
// carrousel (ex. déclenchement anticipé du scénario de publication).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bySecretParam = searchParams.get('secret');
  const authorized = hasValidAutomationSecret(req) || (!!bySecretParam && bySecretParam === process.env.SOCIAL_AUTOMATION_SECRET);
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  return handle(Object.fromEntries(searchParams.entries()));
}
