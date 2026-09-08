// Route ponctuelle : soumet le récap hebdomadaire Elian/Lya du 8-13
// septembre 2026 à HeyGen (script fourni par l'utilisateur le 08/09,
// format "classique" — Elian ouvre, Lya conclut). Désormais superflue
// depuis /api/admin/recap-hebdo (génération automatique, réutilisable
// chaque semaine) — conservée telle quelle pour comparer les deux rendus,
// à supprimer une fois cette semaine passée.

import { NextRequest, NextResponse } from 'next/server';
import { hasValidAutomationSecret } from '@/lib/automationAuth';
import { soumettreRecapDuo } from '@/lib/heygen';

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

  if (!process.env.HEYGEN_API_KEY) return NextResponse.json({ error: 'HEYGEN_API_KEY non configurée.' }, { status: 500 });

  try {
    const videoId = await soumettreRecapDuo(SCRIPT);
    return NextResponse.json({ ok: true, videoId, scenes: SCRIPT.length });
  } catch (err) {
    console.error('heygen-recap-hebdo failed', err);
    return NextResponse.json({ error: 'Soumission HeyGen échouée.', detail: String(err) }, { status: 502 });
  }
}
