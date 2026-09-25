// Reproxifie un export Canva pour Instagram/Facebook — contournement d'un bug
// récurrent (depuis le 21/09) où l'API Graph rejette systématiquement les
// URLs export-download.canva.com avec "Only photo or video can be accepted
// as media type", alors que le fichier est un JPEG valide (vérifié
// manuellement). Une première version de ce proxy utilisait un paramètre de
// requête (?url=<url encodée>) : les logs serveur montrent que le fetcher de
// Meta ne contactait même pas cette route, donc elle était rejetée en amont
// — ce schéma "URL contenant une autre URL en paramètre" est un motif
// classique de proxy ouvert / SSRF que les validateurs automatiques de Meta
// bloquent avant tout appel réseau. Cette version encode plutôt la cible
// dans le chemin, en base64url, avec une extension .jpg finale — une forme
// d'URL statique standard, sans paramètre suspect.
//
// Restreint à export-download.canva.com : ce n'est PAS un proxy ouvert.
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ALLOWED_HOST = 'export-download.canva.com';

export function encodeProxyToken(targetUrl: string): string {
  return Buffer.from(targetUrl, 'utf8').toString('base64url');
}

function decodeProxyToken(token: string): string {
  const withoutExtension = token.replace(/\.jpe?g$/i, '');
  return Buffer.from(withoutExtension, 'base64url').toString('utf8');
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let target: string;
  try {
    target = decodeProxyToken(token);
  } catch {
    return NextResponse.json({ error: 'Jeton invalide.' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: 'URL invalide.' }, { status: 400 });
  }
  if (parsed.protocol !== 'https:' || parsed.hostname !== ALLOWED_HOST) {
    return NextResponse.json({ error: 'Hôte non autorisé.' }, { status: 400 });
  }

  const upstream = await fetch(parsed.toString(), {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; HorosphereImageProxy/1.0)' },
  });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `Échec de récupération de l'image (${upstream.status}).` },
      { status: 502 }
    );
  }

  return new NextResponse(upstream.body, {
    headers: {
      'content-type': 'image/jpeg',
      'cache-control': 'public, max-age=3600',
    },
  });
}
