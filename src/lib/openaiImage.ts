// Génère l'illustration quotidienne des réseaux sociaux via l'API Images
// d'OpenAI (gpt-image-1), puis la stocke sur Vercel Blob pour obtenir une
// URL publique STABLE — indispensable ici : Facebook/Instagram ne
// récupèrent l'image qu'au moment où un humain relit le brouillon et passe
// le statut à "✅ Publier" (parfois plusieurs jours après sa génération),
// alors que les URLs renvoyées directement par OpenAI expirent rapidement.
//
// gpt-image-1 accepte un `output_format` direct (jpeg/png/webp) : demander
// du JPEG ici évite tout traitement d'image côté serveur, puisque c'est
// précisément le format strict qu'exige l'API de publication Instagram
// (voir lib/social.ts, VISUELS_INSTAGRAM). Sans clé OPENAI_API_KEY
// configurée, cette fonction retourne `null` — l'appelant retombe alors sur
// les visuels statiques du site (jamais de blocage du pipeline).

const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations';

// Habillage de marque commun à toute illustration générée, pour rester
// cohérent avec les visuels existants du site (astrolabe, ciel crépusculaire,
// palette chaude et onirique — jamais sombre ni anxiogène).
const STYLE_HORIZON =
  "Illustration numérique douce pour une application française d'astrologie nommée Horosphère. " +
  'Style peinture numérique légèrement stylisée, lumière de crépuscule, palette chaude (ambre, rose poudré, bleu nuit profond), ' +
  "atmosphère sereine et onirique, jamais sombre ni inquiétante. Aucun texte, aucune typographie, aucun logo dans l'image.";

export async function genererIllustrationSociale(sujet: string, dateISO: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const prompt = `${STYLE_HORIZON}\n\nScène du jour : ${sujet}`;

  const res = await fetch(OPENAI_IMAGES_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      size: '1536x1024',
      quality: 'medium',
      output_format: 'jpeg',
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Appel OpenAI Images échoué (${res.status}): ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  const b64: string | undefined = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error('Réponse OpenAI Images sans image.');
  const buffer = Buffer.from(b64, 'base64');

  const { put } = await import('@vercel/blob');
  const blob = await put(`social/${dateISO}-${Date.now()}.jpg`, buffer, {
    access: 'public',
    contentType: 'image/jpeg',
  });
  return blob.url;
}
