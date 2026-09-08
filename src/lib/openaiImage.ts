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
const OPENAI_IMAGES_EDIT_URL = 'https://api.openai.com/v1/images/edits';

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

  return stockerImageSociale(buffer, `social/${dateISO}-${Date.now()}.jpg`);
}

// Le store Blob connecté au projet utilise l'authentification OIDC de
// Vercel (pas de BLOB_READ_WRITE_TOKEN classique) : il faut lui passer
// explicitement son storeId, exposé via la variable d'environnement créée
// à la connexion du store (voir Storage → connexion du projet). Partagé par
// genererIllustrationSociale et genererIllustrationTotem ci-dessous.
async function stockerImageSociale(buffer: Buffer, chemin: string): Promise<string> {
  const { put } = await import('@vercel/blob');
  const storeId = process.env.BLOB_HOROSPHERE_STORE_ID;
  const blob = await put(chemin, buffer, {
    access: 'public',
    contentType: 'image/jpeg',
    ...(storeId ? { storeId } : {}),
  });
  return blob.url;
}

// Illustration des posts Instagram "signe du jour" : plutôt que de décrire
// le style à la main dans un prompt texte (approche fragile, qui a produit
// un résultat qui ne correspondait pas à ce qui était demandé), on part
// d'une image de référence fournie par l'utilisateur — une planche des 12
// signes dans le style souhaité (peinture fantasy semi-réaliste façon
// jaquette de jeu vidéo) — et on demande à GPT de reproduire CE style pour
// un nouveau personnage, via l'API Images/Edits (image-à-image) plutôt que
// Images/Generations (texte seul). Le style vient donc de l'image observée
// par le modèle, pas d'adjectifs écrits dans le code : c'est GPT qui décide
// de la fidélité au rendu, pas une accumulation de mots-clés.
let referenceZodiacBuffer: Buffer | null = null;
async function chargerReferenceZodiac(): Promise<Buffer> {
  if (referenceZodiacBuffer) return referenceZodiacBuffer;
  const { readFile } = await import('fs/promises');
  const { join } = await import('path');
  referenceZodiacBuffer = await readFile(join(process.cwd(), 'public/images/style-reference-zodiac.webp'));
  return referenceZodiacBuffer;
}

export async function genererIllustrationTotem(nomSigne: string, dateISO: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const reference = await chargerReferenceZodiac();
  const prompt =
    `L'image fournie est une planche de référence montrant les 12 signes du zodiaque dans un style de peinture fantasy semi-réaliste (façon jaquette de jeu vidéo), chacun avec son propre personnage et sa propre ambiance de fond. ` +
    `Repère le personnage du signe ${nomSigne} sur cette planche, et génère une NOUVELLE illustration de ce même personnage (même identité visuelle : totem, tenue, ambiance de couleur), dans une pose et un cadrage différents de la référence — jamais une simple copie. ` +
    `Garde exactement le même style de rendu que la référence (peinture semi-réaliste, cadrage vertical buste, fond cosmique dramatique). Aucun texte, lettre, mot ou symbole écrit visible dans l'image.`;

  const form = new FormData();
  form.append('model', 'gpt-image-1');
  form.append('image', new Blob([new Uint8Array(reference)], { type: 'image/webp' }), 'reference.webp');
  form.append('prompt', prompt);
  form.append('size', '1024x1536');
  form.append('quality', 'medium');

  const res = await fetch(OPENAI_IMAGES_EDIT_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Appel OpenAI Images/Edits échoué (${res.status}): ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  const b64: string | undefined = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error('Réponse OpenAI Images/Edits sans image.');
  const buffer = Buffer.from(b64, 'base64');

  return stockerImageSociale(buffer, `social/${dateISO}-totem-${Date.now()}.jpg`);
}
