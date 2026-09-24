// Reproxifie un export Canva pour Instagram/Facebook — contournement d'un bug
// récurrent (24/09) où l'API Graph rejette systématiquement les URLs
// export-download.canva.com avec "Only photo or video can be accepted as
// media type", alors que le fichier est un JPEG valide (vérifié manuellement).
// Cause probable : le fetcher de Meta (facebookexternalhit) se voit bloquer
// ou mal servir ces URLs S3 signées, particulièrement longues et à courte
// durée de vie. Ce proxy fournit une URL stable, courte, sur notre propre
// domaine, avec un Content-Type explicite — ce que le fetcher de Meta attend.
//
// Restreint à export-download.canva.com : ce n'est PAS un proxy ouvert.
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ALLOWED_HOST = 'export-download.canva.com';

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get('url');
  if (!target) {
    return NextResponse.json({ error: 'Paramètre url requis.' }, { status: 400 });
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
