import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dbConfigured } from '@/lib/db';
import { markOnboardingSeen } from '@/lib/onboarding';

// Marque la vidéo d'onboarding comme vue — appelée à la fin de la lecture
// ou dès que l'utilisateur clique sur "passer" (jamais rejouée ensuite).
export async function POST() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "La base de données n'est pas configurée." }, { status: 503 });

  await markOnboardingSeen(Number(userId));
  return NextResponse.json({ ok: true });
}
