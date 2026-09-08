import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dbConfigured } from '@/lib/db';
import { statutAvent, reclamerCadeauAvent } from '@/lib/advent';

// GET : statut du calendrier pour l'utilisateur connecté (jour du jour,
// cases déjà réclamées). POST : réclame la case du jour — idempotent, sans
// effet si déjà réclamée ou hors période (voir lib/advent.ts).

async function requireUserId(): Promise<number | null> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  return userId ? Number(userId) : null;
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "La base de données n'est pas configurée." }, { status: 503 });

  const statut = await statutAvent(userId);
  return NextResponse.json(statut);
}

export async function POST() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "La base de données n'est pas configurée." }, { status: 503 });

  const resultat = await reclamerCadeauAvent(userId);
  if (!resultat.ok) {
    const message = resultat.raison === 'hors-periode' ? "Le calendrier n'est ouvert que du 1er au 24 décembre." : "Case déjà réclamée aujourd'hui.";
    return NextResponse.json({ error: message, raison: resultat.raison }, { status: 400 });
  }
  return NextResponse.json({ ok: true, jour: resultat.jour, credits: resultat.credits });
}
