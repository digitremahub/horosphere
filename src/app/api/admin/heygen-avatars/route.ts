import { NextRequest, NextResponse } from 'next/server';
import { hasValidAutomationSecret } from '@/lib/automationAuth';

// Route de diagnostic TEMPORAIRE — liste les avatars du compte HeyGen
// connecté (stock + avatars personnalisés/instant) pour identifier l'ID
// d'un avatar créé par l'utilisateur. À supprimer une fois l'ID récupéré
// (même usage ponctuel que /api/admin/heygen-lookup, déjà supprimée).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bySecretParam = searchParams.get('secret');
  const authorized = hasValidAutomationSecret(req) || (!!bySecretParam && bySecretParam === process.env.SOCIAL_AUTOMATION_SECRET);
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'HEYGEN_API_KEY non configurée.' }, { status: 500 });
  }

  try {
    const [avatarsRes, groupsRes] = await Promise.all([
      fetch('https://api.heygen.com/v2/avatars', { headers: { 'x-api-key': apiKey }, cache: 'no-store' }),
      fetch('https://api.heygen.com/v2/avatar_group.list', { headers: { 'x-api-key': apiKey }, cache: 'no-store' }),
    ]);
    const avatarsData = await avatarsRes.json().catch(() => null);
    const groupsData = await groupsRes.json().catch(() => null);

    const talkingPhotos = avatarsData?.data?.talking_photos ?? [];
    const avatars = avatarsData?.data?.avatars ?? [];

    return NextResponse.json({
      ok: true,
      // Les avatars "personnalisés" (créés par l'utilisateur, photo ou
      // instant avatar) apparaissent ici — un avatar de stock générique a
      // premium=false et n'est pas lié à un groupe personnel.
      talkingPhotos: talkingPhotos.map((t: { talking_photo_id: string; talking_photo_name: string }) => ({ id: t.talking_photo_id, nom: t.talking_photo_name })),
      avatarGroups: (groupsData?.data?.avatar_group_list ?? []).map((g: { id: string; name: string; group_type?: string }) => ({ id: g.id, nom: g.name, type: g.group_type })),
      avatarsCount: avatars.length,
      premiersAvatars: avatars.slice(0, 5).map((a: { avatar_id: string; avatar_name: string; premium: boolean }) => ({ id: a.avatar_id, nom: a.avatar_name, premium: a.premium })),
    });
  } catch (err) {
    return NextResponse.json({ error: 'Lecture HeyGen échouée.', detail: String(err) }, { status: 502 });
  }
}
