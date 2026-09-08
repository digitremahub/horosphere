// Génération de la vidéo avatar du récap hebdomadaire (dimanche) via l'API
// HeyGen — un avatar de stock lit un script couvrant les 12 signes. Comme
// Shotstack (voir lib/shotstack.ts), la génération est asynchrone : on
// soumet la vidéo (réponse quasi instantanée) puis on interroge son statut
// séparément une fois que le rendu a eu le temps de se terminer.
//
// HEYGEN_AVATAR_ID et HEYGEN_VOICE_ID pointent vers un avatar/voix de stock
// à choisir dans le tableau de bord HeyGen (GET /v2/avatars et /v2/voices
// listent les identifiants disponibles) — à défaut de valeur configurée, on
// retombe sur des valeurs par défaut confirmées disponibles sur le compte
// connecté (voir /api/admin/heygen-lookup, à retirer une fois ce choix
// définitif).
//
// Utilise volontairement l'API v2 (POST /v2/video/generate) plutôt que la
// v3 : la v3 "Generate from template" impose de construire un template à
// l'avance dans le tableau de bord HeyGen (pas d'équivalent freeform
// avatar+script simple trouvé dans sa documentation), alors que la v2 reste
// pleinement fonctionnelle jusqu'au 31/10/2026 — largement de quoi migrer
// plus tard sans urgence. À surveiller avant cette date.

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
  // Valeurs par défaut vérifiées disponibles sur le compte HeyGen connecté
  // (voir /api/admin/heygen-lookup) : avatar de stock générique + voix
  // française "Gaëlle" (le script est en français — une voix non taguée
  // French rendrait un accent anglais peu crédible pour la marque).
  const avatarId = process.env.HEYGEN_AVATAR_ID || 'Abigail_expressive_2024112501';
  const voiceId = process.env.HEYGEN_VOICE_ID || '67375f26ab6e44ce8569cea3840ef594';

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

export type ScenePersona = { avatarId: string; voiceId: string; texte: string };

/** Soumet une vidéo à SCÈNES MULTIPLES (plusieurs personnages qui se
 * succèdent, ex. le duo Elian/Lya du récap hebdomadaire) — chaque scène du
 * tableau `video_inputs` de l'API HeyGen a son propre avatar/voix/texte,
 * concaténées dans l'ordre en une seule vidéo. Complément de
 * soumettreAvatarVideo (un seul avatar) pour les formats à deux voix. */
export async function soumettreAvatarVideoMultiScenes(scenes: ScenePersona[]): Promise<string> {
  const apiKey = requireApiKey();
  const res = await fetch(`${HEYGEN_API_BASE}/v2/video/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({
      video_inputs: scenes.map((s) => ({
        character: { type: 'avatar', avatar_id: s.avatarId, avatar_style: 'normal' },
        voice: { type: 'text', input_text: s.texte, voice_id: s.voiceId },
        background: { type: 'color', value: '#0b0b1a' },
      })),
      dimension: { width: 1080, height: 1920 },
    }),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.data?.video_id) {
    throw new Error(`Soumission de la vidéo HeyGen (multi-scènes) échouée (${res.status}): ${JSON.stringify(data).slice(0, 300)}`);
  }
  return data.data.video_id as string;
}

/** Résout le premier avatar_id concret d'un groupe d'avatars personnalisé
 * (ex. les groupes "Elian"/"Lya" créés par l'utilisateur sur HeyGen) — un
 * groupe expose un ou plusieurs "looks", on prend le premier par défaut. */
export async function resoudrePremierAvatarDuGroupe(apiKey: string, groupId: string): Promise<string> {
  const res = await fetch(`${HEYGEN_API_BASE}/v2/avatar_group/${encodeURIComponent(groupId)}/avatars`, {
    headers: { 'x-api-key': apiKey },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  const liste = data?.data?.avatar_list ?? data?.data ?? [];
  const premier = Array.isArray(liste) ? liste[0] : null;
  const avatarId = premier?.avatar_id || premier?.id;
  if (!avatarId) throw new Error(`Aucun avatar trouvé dans le groupe ${groupId} : ${JSON.stringify(data).slice(0, 200)}`);
  return avatarId;
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
