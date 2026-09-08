// Route ponctuelle : soumet le récap hebdomadaire Elian/Lya du 8-13
// septembre 2026 à HeyGen (script fourni par l'utilisateur le 08/09,
// format "classique" — Elian ouvre, Lya conclut). Résout les avatar_id
// concrets des deux groupes personnalisés déjà créés côté HeyGen (voir
// README, section Elian & Lya) puis soumet une vidéo à scènes multiples
// (lib/heygen.ts, soumettreAvatarVideoMultiScenes) — une scène par
// réplique, dans l'ordre du script. À supprimer une fois cette semaine
// passée (même durée de vie que les autres routes de diagnostic
// ponctuelles de ce projet).

import { NextRequest, NextResponse } from 'next/server';
import { hasValidAutomationSecret } from '@/lib/automationAuth';
import { resoudrePremierAvatarDuGroupe, soumettreAvatarVideoMultiScenes } from '@/lib/heygen';

const GROUPE_ELIAN = 'd834d67e44e749c28407524b9f303c52';
const GROUPE_LYA = '7d62100aa9b54ec080492deb1ec67e02';

// Voix françaises par défaut si HEYGEN_VOICE_ELIAN/HEYGEN_VOICE_LYA ne sont
// pas configurées sur le compte Vercel — même voix de secours que
// soumettreAvatarVideo(), pas idéal pour deux personas distincts mais
// jamais bloquant : à affiner une fois le premier rendu écouté.
const VOIX_DEFAUT = '67375f26ab6e44ce8569cea3840ef594';

const SCRIPT: { persona: 'elian' | 'lya'; texte: string }[] = [
  { persona: 'elian', texte: "Cette semaine, il y a un événement qu'on ne pouvait pas ignorer." },
  { persona: 'lya', texte: 'Le 11 septembre, une Nouvelle Lune en Vierge.' },
  {
    persona: 'elian',
    texte:
      "Une Nouvelle Lune, c'est toujours un point de départ symbolique. Une page qui se tourne, discrètement, sans bruit. Et en Vierge, ce n'est jamais un hasard : c'est le signe de l'ordre, du détail, de ce qu'on remet sans cesse à plus tard parce que ce n'est pas encore le bon moment. Cette semaine, le ciel dit l'inverse : c'est maintenant.",
  },
  {
    persona: 'lya',
    texte:
      "Et si tu es du signe de la Vierge, cette énergie te concerne encore plus directement. C'est ton moment pour reprendre une habitude que tu as laissée filer. Pas besoin de tout changer d'un coup, une seule chose, mais faite proprement.",
  },
  {
    persona: 'elian',
    texte:
      'Et pour le reste de la semaine, deux autres mouvements à connaître. Vénus entre en Scorpion : les relations vont demander plus de sincérité, moins de surface.',
  },
  {
    persona: 'lya',
    texte:
      "Et Uranus se met en rétrograde, traduction simple : ce n'est pas le moment de tout casser pour repartir à zéro. C'est le moment de finir ce qui traîne.",
  },
  {
    persona: 'lya',
    texte:
      "Alors, action de la semaine, pour tout le monde : choisis une chose que tu repousses depuis trop longtemps. Une seule. Et fais-la avant dimanche prochain. Pas besoin d'attendre le bon moment. Le ciel vient de te le donner.",
  },
  { persona: 'elian', texte: 'Le ciel donne le cadre.' },
  { persona: 'lya', texte: 'Toi, tu donnes le résultat. À la semaine prochaine, sur Horosphère.' },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bySecretParam = searchParams.get('secret');
  const authorized = hasValidAutomationSecret(req) || (!!bySecretParam && bySecretParam === process.env.SOCIAL_AUTOMATION_SECRET);
  if (!authorized) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });

  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'HEYGEN_API_KEY non configurée.' }, { status: 500 });

  try {
    const [avatarElian, avatarLya] = await Promise.all([
      resoudrePremierAvatarDuGroupe(apiKey, GROUPE_ELIAN),
      resoudrePremierAvatarDuGroupe(apiKey, GROUPE_LYA),
    ]);
    const voixElian = process.env.HEYGEN_VOICE_ELIAN || VOIX_DEFAUT;
    const voixLya = process.env.HEYGEN_VOICE_LYA || VOIX_DEFAUT;

    const scenes = SCRIPT.map((s) => ({
      avatarId: s.persona === 'elian' ? avatarElian : avatarLya,
      voiceId: s.persona === 'elian' ? voixElian : voixLya,
      texte: s.texte,
    }));

    const videoId = await soumettreAvatarVideoMultiScenes(scenes);
    return NextResponse.json({ ok: true, videoId, avatarElian, avatarLya, scenes: scenes.length });
  } catch (err) {
    console.error('heygen-recap-hebdo failed', err);
    return NextResponse.json({ error: 'Soumission HeyGen échouée.', detail: String(err) }, { status: 502 });
  }
}
