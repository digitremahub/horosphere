import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { signFromBirthdate, findSign, SIGNS } from '@/lib/zodiac';
import { generateHoroscope, generateAstralChart, generateSentiment, generateCompatibility, generateGrandeAnalyse } from '@/lib/anthropic';
import { consumeCredits, getBalance, InsufficientCreditsError } from '@/lib/credits';
import { getProfile } from '@/lib/profile';
import { FEATURE_COSTS, FEATURE_LABELS, FeatureKey } from '@/lib/pricing';
import { dbConfigured } from '@/lib/db';

/** Clé de semaine ISO (ex: "2026-S36") — donne une portée stable pour toute
 * la semaine à l'analyse sentimentale, plutôt qu'une régénération par jour. */
function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-S${String(weekNo).padStart(2, '0')}`;
}

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

  // La compatibilité amoureuse est la seule lecture qui compare à un second
  // signe, choisi librement côté client — sans jamais quitter le sien
  // (issu du profil) comme point de départ.
  let autreSign = null as ReturnType<typeof findSign> | null;
  if (feature === 'compatibilite_amoureuse') {
    const autreSlug = String(body.autreSigne || '');
    const isValidSlug = SIGNS.some((s) => s.key === autreSlug);
    if (!isValidSlug) {
      return NextResponse.json({ error: 'Choisis un second signe pour la compatibilité.' }, { status: 400 });
    }
    autreSign = findSign(autreSlug);
  }

  const uid = Number(userId);

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
    feature === 'horoscope_personnalise' || feature === 'theme_astral_complet' || feature === 'grande_analyse'
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
    switch (feature) {
      case 'theme_astral_complet':
        reading = await generateAstralChart({ sign, naissance: naissance! });
        break;
      case 'analyse_sentimentale':
        reading = await generateSentiment({ sign, weekKey: isoWeekKey(new Date()) });
        break;
      case 'compatibilite_amoureuse': {
        const compat = await generateCompatibility({ sign, autreSign: autreSign!, seedKey: dateISO.slice(0, 7) });
        // Le second signe est stocké avec la lecture : indispensable pour
        // pouvoir la réafficher à l'identique dans l'historique plus tard.
        reading = { ...compat, autreSigne: { key: autreSign!.key, nom: autreSign!.nom, symbole: autreSign!.symbole } };
        break;
      }
      case 'grande_analyse':
        reading = await generateGrandeAnalyse({ sign, naissance: naissance! });
        break;
      default:
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
