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

  const groupId = searchParams.get('groupId');
  const voix = searchParams.get('voices');

  try {
    if (voix) {
      // Voix françaises disponibles (stock) — pour choisir deux voix
      // distinctes pour Elian/Lya, actuellement sur la même voix par
      // défaut (voir HEYGEN_VOICE_ELIAN/HEYGEN_VOICE_LYA, lib/heygen.ts).
      const res = await fetch('https://api.heygen.com/v2/voices', { headers: { 'x-api-key': apiKey }, cache: 'no-store' });
      const data = await res.json().catch(() => null);
      const toutes: { voice_id: string; name: string; language?: string; gender?: string }[] = data?.data?.voices ?? [];
      const francaises = toutes.filter((v) => (v.language || '').toLowerCase().includes('french'));
      return NextResponse.json({
        ok: true,
        total: toutes.length,
        francaises: francaises.map((v) => ({ id: v.voice_id, nom: v.name, genre: v.gender })),
      });
    }

    if (groupId) {
      // Détail d'un groupe d'avatars personnalisé (ex. "Lya", "Elian") :
      // renvoie les looks/avatar_id concrets utilisables par soumettreAvatarVideo.
      const res = await fetch(`https://api.heygen.com/v2/avatar_group/${encodeURIComponent(groupId)}/avatars`, {
        headers: { 'x-api-key': apiKey },
        cache: 'no-store',
      });
      const data = await res.json().catch(() => null);
      return NextResponse.json({ ok: true, groupId, avatars: data?.data?.avatar_list ?? data?.data ?? data });
    }

    const groupsRes = await fetch('https://api.heygen.com/v2/avatar_group.list', { headers: { 'x-api-key': apiKey }, cache: 'no-store' });
    const groupsData = await groupsRes.json().catch(() => null);

    return NextResponse.json({
      ok: true,
      // Les avatars personnalisés créés par l'utilisateur (photo ou instant
      // avatar) apparaissent comme des groupes ici — le stock générique
      // (des milliers d'entrées) n'est volontairement pas renvoyé.
      avatarGroups: (groupsData?.data?.avatar_group_list ?? []).map((g: { id: string; name: string; group_type?: string }) => ({ id: g.id, nom: g.name, type: g.group_type })),
    });
  } catch (err) {
    return NextResponse.json({ error: 'Lecture HeyGen échouée.', detail: String(err) }, { status: 502 });
  }
}
