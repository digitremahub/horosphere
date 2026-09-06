// Génération de la vidéo avatar du récap hebdomadaire (dimanche) via l'API
// HeyGen — un avatar de stock lit un script couvrant les 12 signes. Comme
// Shotstack (voir lib/shotstack.ts), la génération est asynchrone : on
// soumet la vidéo (réponse quasi instantanée) puis on interroge son statut
// séparément une fois que le rendu a eu le temps de se terminer.
//
// HEYGEN_AVATAR_ID et HEYGEN_VOICE_ID pointent vers un avatar/voix de stock
// à choisir dans le tableau de bord HeyGen (GET /v2/avatars et /v2/voices
// listent les identifiants disponibles) — à défaut de valeur configurée, on
// retombe sur des identifiants de stock courants, à ajuster une fois le
// compte HeyGen exploré.

const HEYGEN_API_BASE = 'https://api.heygen.com';

export type HeygenVideoStatus = {
  status: string; // 'pending' | 'processing' | 'completed' | 'failed'
  url: string | null;
  error: string | null;
};

function requireApiKey(): string {
  const key = process.env.HEYGEN_API_KEY;
  if (!key) throw new Error('HEYGEN_API_KEY non configurée.');
  return key;
}

/** Soumet la génération de la vidéo avatar à partir d'un script complet
 * (le texte que l'avatar va lire, en français). Renvoie l'identifiant de la
 * vidéo, à interroger via `etatAvatarVideo`. */
export async function soumettreAvatarVideo(script: string): Promise<string> {
  const apiKey = requireApiKey();
  const avatarId = process.env.HEYGEN_AVATAR_ID || 'Daisy-inskirt-20220818';
  const voiceId = process.env.HEYGEN_VOICE_ID || '2d5b0e6cf36f460aa7fc47e3eee4ba54';

  const res = await fetch(`${HEYGEN_API_BASE}/v2/video/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({
      video_inputs: [
        {
          character: { type: 'avatar', avatar_id: avatarId, avatar_style: 'normal' },
          voice: { type: 'text', input_text: script, voice_id: voiceId },
          background: { type: 'color', value: '#0b0b1a' },
        },
      ],
      dimension: { width: 1080, height: 1920 },
    }),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.data?.video_id) {
    throw new Error(`Soumission de la vidéo HeyGen échouée (${res.status}): ${JSON.stringify(data).slice(0, 300)}`);
  }
  return data.data.video_id as string;
}

export async function etatAvatarVideo(videoId: string): Promise<HeygenVideoStatus> {
  const apiKey = requireApiKey();
  const res = await fetch(`${HEYGEN_API_BASE}/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`, {
    headers: { 'x-api-key': apiKey },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.data) {
    throw new Error(`Lecture du statut HeyGen échouée (${res.status}): ${JSON.stringify(data).slice(0, 300)}`);
  }
  return {
    status: data.data.status ?? 'unknown',
    url: data.data.video_url ?? null,
    error: data.data.error?.message ?? null,
  };
}
