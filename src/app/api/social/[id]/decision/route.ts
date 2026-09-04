import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPost, setStatut } from '@/lib/socialStore';
import { isAdminEmail } from '@/lib/socialAuth';
import { dbConfigured } from '@/lib/db';

// Validation humaine d'un brouillon (voir /admin/social) — approuver ou
// rejeter. C'est la seule porte qui fait passer un post de "brouillon" à
// "approuvé" : rien n'est publié tant qu'un admin n'est pas passé par ici.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const email = (session?.user as { email?: string } | undefined)?.email;
  if (!session || !isAdminEmail(email)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 });
  }
  if (!dbConfigured) {
    return NextResponse.json({ error: "La base de données n'est pas configurée." }, { status: 503 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body.action;
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'Action invalide.' }, { status: 400 });
  }

  const existing = await getPost(id);
  if (!existing) {
    return NextResponse.json({ error: 'Post introuvable.' }, { status: 404 });
  }
  if (existing.statut !== 'brouillon') {
    return NextResponse.json({ error: `Ce post n'est plus au statut "brouillon" (statut actuel : ${existing.statut}).` }, { status: 409 });
  }

  const post = await setStatut(id, action === 'approve' ? 'approuve' : 'rejete');
  return NextResponse.json({ ok: true, post });
}
