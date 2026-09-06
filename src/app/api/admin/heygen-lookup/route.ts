// Diagnostic ponctuel — à retirer une fois un avatar_id/voice_id valides
// identifiés et renseignés en dur (HEYGEN_AVATAR_ID/HEYGEN_VOICE_ID) dans
// lib/heygen.ts. Liste les avatars/voix disponibles sur le compte HeyGen
// connecté, pour remplacer les identifiants de stock devinés (invalides —
// voir génération du récap dominical) par de vrais identifiants.
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('secret') !== process.env.SOCIAL_AUTOMATION_SECRET) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'HEYGEN_API_KEY absente.' }, { status: 503 });

  const [avatarsRes, voicesRes] = await Promise.all([
    fetch('https://api.heygen.com/v2/avatars', { headers: { 'x-api-key': apiKey }, cache: 'no-store' }),
    fetch('https://api.heygen.com/v2/voices', { headers: { 'x-api-key': apiKey }, cache: 'no-store' }),
  ]);
  const avatarsData = await avatarsRes.json().catch(() => null);
  const voicesData = await voicesRes.json().catch(() => null);

  const avatars = (avatarsData?.data?.avatars ?? []).slice(0, 15).map((a: any) => ({ avatar_id: a.avatar_id, name: a.avatar_name }));
  const voices = (voicesData?.data?.voices ?? [])
    .filter((v: any) => v.language === 'French' || v.language === 'English')
    .slice(0, 15)
    .map((v: any) => ({ voice_id: v.voice_id, name: v.name, language: v.language, gender: v.gender }));

  return NextResponse.json({ avatarsStatus: avatarsRes.status, voicesStatus: voicesRes.status, avatars, voices });
}
