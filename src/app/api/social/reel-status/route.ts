import { NextRequest, NextResponse } from 'next/server';
import { hasValidAutomationSecret } from '@/lib/automationAuth';
import { etatRenderReel } from '@/lib/shotstack';
import { etatAvatarVideo } from '@/lib/heygen';

// Appelée par Make après un délai (module Sleep) suivant generate-reel, pour
// savoir si le rendu vidéo est terminé — un rendu Shotstack/HeyGen prend
// couramment 10 à 60s, trop long pour attendre en synchrone dans une seule
// requête serverless (voir lib/shotstack.ts). GET plutôt que POST : appelé
// à la main via le même mécanisme que les autres routes de diagnostic
// (secret en paramètre), utile pour suivre un rendu en cours d'un simple
// navigateur pendant la mise au point.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bySecretParam = searchParams.get('secret');
  const authorized = hasValidAutomationSecret(req) || (!!bySecretParam && bySecretParam === process.env.SOCIAL_AUTOMATION_SECRET);
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const provider = searchParams.get('provider');
  const id = searchParams.get('id');
  if (!id || (provider !== 'shotstack' && provider !== 'heygen')) {
    return NextResponse.json({ error: "Paramètres 'provider' (shotstack ou heygen) et 'id' requis." }, { status: 400 });
  }

  try {
    const etat = provider === 'shotstack' ? await etatRenderReel(id) : await etatAvatarVideo(id);
    return NextResponse.json({ ok: true, provider, id, ...etat });
  } catch (err) {
    console.error('reel-status failed', err);
    return NextResponse.json({ error: 'La lecture du statut a échoué.' }, { status: 502 });
  }
}
