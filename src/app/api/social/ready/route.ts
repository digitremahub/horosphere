import { NextRequest, NextResponse } from 'next/server';
import { listPosts } from '@/lib/socialStore';
import { hasValidAutomationSecret } from '@/lib/socialAuth';
import { dbConfigured } from '@/lib/db';

// Appelée par le scénario Make.com "Publication" — renvoie les posts déjà
// approuvés par un humain (voir /admin/social) et pas encore publiés, pour
// que Make les poste sur Facebook/Instagram puis confirme via
// /api/social/[id]/publish. Ne renvoie jamais un post au statut
// "brouillon" : rien n'est publié sans validation.
export async function GET(req: NextRequest) {
  if (!hasValidAutomationSecret(req)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  if (!dbConfigured) {
    return NextResponse.json({ error: "La base de données n'est pas configurée." }, { status: 503 });
  }

  try {
    const posts = await listPosts({ statut: 'approuve', limit: 20 });
    return NextResponse.json({ posts });
  } catch (err) {
    console.error('listPosts failed', err);
    return NextResponse.json({ error: 'Impossible de charger les posts approuvés.' }, { status: 500 });
  }
}
