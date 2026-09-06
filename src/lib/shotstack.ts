// Rendu vidéo pour les reels quotidiens (texte animé + image + musique) via
// l'API Shotstack. Reste volontairement asynchrone : un rendu vidéo prend
// couramment 10 à 60s, largement au-delà de ce qu'il est raisonnable
// d'attendre en synchrone dans une fonction serverless — l'appelant soumet
// le rendu (réponse quasi instantanée) puis interroge son statut séparément
// (voir /api/social/reel-status), à la manière dont Make orchestre déjà les
// étapes lentes des autres scénarios avec un module Sleep entre les deux.
//
// SHOTSTACK_ENV vaut 'stage' (bac à sable, gratuit, vidéos filigranées) ou
// 'v1' (production, facturée) — un simple changement de variable
// d'environnement suffit à basculer, sans toucher au code.

const SHOTSTACK_ENV = process.env.SHOTSTACK_ENV || 'stage';
const SHOTSTACK_BASE = `https://api.shotstack.io/edit/${SHOTSTACK_ENV}`;

export type ShotstackRenderStatus = {
  status: string; // 'queued' | 'fetching' | 'rendering' | 'saving' | 'done' | 'failed'
  url: string | null;
  error: string | null;
};

function requireApiKey(): string {
  const key = process.env.SHOTSTACK_API_KEY;
  if (!key) throw new Error('SHOTSTACK_API_KEY non configurée.');
  return key;
}

/** Soumet un rendu "carte animée" : une image de fond (zoom lent), un titre
 * (ex. le nom du signe) et un texte plus court en dessous (le message du
 * jour). Pas de musique pour l'instant — Shotstack sait en ajouter une
 * (`timeline.soundtrack`) dès qu'on aura une piste libre de droits hébergée
 * à demeure ; ajouter ce champ plus tard n'affecte rien d'existant. Renvoie
 * l'identifiant du rendu, à interroger via `etatRenderReel`. */
export async function soumettreRenderReel(opts: { imageUrl: string; titre: string; texte: string }): Promise<string> {
  const apiKey = requireApiKey();
  const duree = 8; // secondes — court, pensé pour un reel quotidien

  const edit = {
    timeline: {
      background: '#0b0b1a',
      tracks: [
        {
          clips: [
            {
              asset: { type: 'title', text: opts.titre, style: 'future', color: '#f5e6c8', size: 'large', position: 'top' },
              start: 0.4,
              length: duree - 0.4,
              transition: { in: 'fade', out: 'fade' },
            },
            {
              asset: { type: 'title', text: opts.texte, style: 'subtitle', color: '#ffffff', size: 'small', position: 'bottom' },
              start: 1.2,
              length: duree - 1.2,
              transition: { in: 'fade', out: 'fade' },
            },
          ],
        },
        {
          clips: [
            {
              asset: { type: 'image', src: opts.imageUrl },
              start: 0,
              length: duree,
              fit: 'cover',
              effect: 'zoomIn',
            },
          ],
        },
      ],
    },
    output: {
      format: 'mp4',
      size: { width: 1080, height: 1920 },
    },
  };

  const res = await fetch(`${SHOTSTACK_BASE}/render`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify(edit),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.response?.id) {
    throw new Error(`Soumission du rendu Shotstack échouée (${res.status}): ${JSON.stringify(data).slice(0, 300)}`);
  }
  return data.response.id as string;
}

export async function etatRenderReel(renderId: string): Promise<ShotstackRenderStatus> {
  const apiKey = requireApiKey();
  const res = await fetch(`${SHOTSTACK_BASE}/render/${renderId}`, {
    headers: { 'x-api-key': apiKey },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.response) {
    throw new Error(`Lecture du statut Shotstack échouée (${res.status}): ${JSON.stringify(data).slice(0, 300)}`);
  }
  return {
    status: data.response.status ?? 'unknown',
    url: data.response.url ?? null,
    error: data.response.error ?? null,
  };
}
