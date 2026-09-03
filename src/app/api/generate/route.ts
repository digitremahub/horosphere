import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { signFromBirthdate } from '@/lib/zodiac';
import { generateHoroscope, generateAstralChart } from '@/lib/anthropic';
import { consumeCredits, getBalance, InsufficientCreditsError } from '@/lib/credits';
import { getProfile } from '@/lib/profile';
import { FEATURE_COSTS, FEATURE_LABELS, FeatureKey } from '@/lib/pricing';
import { dbConfigured } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!session || !userId) {
    return NextResponse.json({ error: 'Connecte-toi pour générer une lecture.' }, { status: 401 });
  }

  if (!dbConfigured) {
    return NextResponse.json(
      { error: "La base de données n'est pas encore connectée — les crédits ne peuvent pas être suivis." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const feature = body.feature as FeatureKey;

  if (!feature || !(feature in FEATURE_COSTS)) {
    return NextResponse.json({ error: 'Fonctionnalité inconnue.' }, { status: 400 });
  }
  if (!FEATURE_LABELS[feature].disponible) {
    return NextResponse.json({ error: 'Cette fonctionnalité arrive bientôt.' }, { status: 400 });
  }
  if (feature !== 'horoscope_quotidien' && feature !== 'horoscope_personnalise' && feature !== 'theme_astral_complet') {
    return NextResponse.json({ error: 'Fonctionnalité pas encore branchée côté serveur.' }, { status: 400 });
  }

  const uid = Number(userId);

  // Le signe vient toujours du profil obligatoire (date de naissance),
  // jamais d'un choix libre côté client : chaque compte n'a qu'un seul
  // signe, le sien. (Seule une future "compatibilité amoureuse" comparera
  // à un second signe, sans jamais quitter le sien comme point de départ.)
  let profile;
  try {
    profile = await getProfile(uid);
  } catch (err) {
    console.error('getProfile failed', err);
    return NextResponse.json({ error: 'Impossible de charger votre profil.' }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json(
      { error: 'Complète ton profil avant de générer une lecture.', code: 'PROFILE_REQUIRED' },
      { status: 400 }
    );
  }

  const [, m, d] = profile.date_naissance.split('-').map(Number);
  const sign = signFromBirthdate(m, d);
  const naissance =
    feature === 'horoscope_personnalise' || feature === 'theme_astral_complet'
      ? {
          date: profile.date_naissance,
          heure: profile.heure_naissance ? profile.heure_naissance.slice(0, 5) : undefined,
          lieu: profile.lieu_naissance,
        }
      : undefined;

  const cost = FEATURE_COSTS[feature];

  const balance = await getBalance(uid);
  if (balance < cost) {
    return NextResponse.json(
      { error: `Crédits insuffisants (${balance}/${cost}).`, balance, needed: cost, code: 'INSUFFICIENT_CREDITS' },
      { status: 402 }
    );
  }

  const dateISO = new Date().toISOString().slice(0, 10);

  let reading;
  try {
    if (feature === 'theme_astral_complet') {
      reading = await generateAstralChart({ sign, naissance: naissance! });
    } else {
      reading = await generateHoroscope({ feature, sign, dateISO, naissance });
    }
  } catch (err) {
    console.error('generation failed', err);
    return NextResponse.json({ error: "La génération a échoué, réessaie dans un instant." }, { status: 502 });
  }

  try {
    await consumeCredits(uid, feature, sign.key, reading);
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: `Crédits insuffisants (${err.available}/${err.needed}).`, code: 'INSUFFICIENT_CREDITS' },
        { status: 402 }
      );
    }
    console.error('consumeCredits failed', err);
    return NextResponse.json({ error: 'Erreur lors du débit des crédits.' }, { status: 500 });
  }

  const newBalance = await getBalance(uid);

  return NextResponse.json({ sign: { key: sign.key, nom: sign.nom, symbole: sign.symbole, dates: sign.dates, element: sign.element, planete: sign.planete }, reading, balance: newBalance });
}
