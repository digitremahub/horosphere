import { NextRequest, NextResponse } from 'next/server';
import { getPost, markPublished } from '@/lib/socialStore';
import { hasValidAutomationSecret } from '@/lib/socialAuth';
import { dbConfigured } from '@/lib/db';

// Appelée par Make.com juste après avoir posté avec succès sur
// Facebook/Instagram — confirme que ce brouillon approuvé est bien en
// ligne, pour qu'il ne soit plus jamais renvoyé par /api/social/ready.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!hasValidAutomationSecret(req)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  if (!dbConfigured) {
    return NextResponse.json({ error: "La base de données n'est pas configurée." }, { status: 503 });
  }

  const { id } = await params;
  const existing = await getPost(id);
  if (!existing) {
    return NextResponse.json({ error: 'Post introuvable.' }, { status: 404 });
  }
  if (existing.statut !== 'approuve') {
    return NextResponse.json({ error: `Ce post n'est pas au statut "approuvé" (statut actuel : ${existing.statut}).` }, { status: 409 });
  }

  const post = await markPublished(id);
  return NextResponse.json({ ok: true, post });
}
