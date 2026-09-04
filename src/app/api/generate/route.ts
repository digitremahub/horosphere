import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { signFromBirthdate } from '@/lib/zodiac';
import {
  generateHoroscope,
  generateAstralChart,
  generateSentiment,
  generateCompatibility,
  generateGrandeAnalyse,
  generateThematic,
  generateLunarCycle,
  generateTransits,
} from '@/lib/anthropic';
import { consumeCredits, getBalance, hasActiveSubscription, InsufficientCreditsError } from '@/lib/credits';
import { getProfile } from '@/lib/profile';
import { FEATURE_COSTS, FEATURE_LABELS, FeatureKey } from '@/lib/pricing';
import { THEMES, type ThemeKey } from '@/lib/themes';
import { dbConfigured } from '@/lib/db';

const THEME_KEYS = new Set(Object.keys(THEMES));
function isThemeKey(feature: FeatureKey): feature is FeatureKey & ThemeKey {
  return THEME_KEYS.has(feature);
}

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

  // La compatibilité amoureuse est la seule lecture qui compare à une
  // seconde personne — prénom + date de naissance, saisis librement côté
  // client — sans jamais quitter le sien (issu du profil) comme point de
  // départ. Le signe est toujours recalculé ici, jamais reçu du client.
  let autrePrenom = '';
  let autreDate = '';
  let autreSign = null as ReturnType<typeof signFromBirthdate> | null;
  if (feature === 'compatibilite_amoureuse') {
    autrePrenom = String(body.autrePrenom || '').trim().slice(0, 60);
    autreDate = String(body.autreDateNaissance || '');
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(autreDate);
    if (!autrePrenom || !match) {
      return NextResponse.json({ error: 'Indique le prénom et la date de naissance de la personne à comparer.' }, { status: 400 });
    }
    autreSign = signFromBirthdate(Number(match[2]), Number(match[3]));
  }

  const uid = Number(userId);

  // Certaines lectures (voir pricing.ts, subscriptionOnly) ne sont pas
  // ouvertes au paiement à la carte : il faut un abonnement actif, quel
  // que soit le solde de crédits.
  if (FEATURE_LABELS[feature].subscriptionOnly) {
    let subscribed = false;
    try {
      subscribed = await hasActiveSubscription(uid);
    } catch (err) {
      console.error('hasActiveSubscription failed', err);
      return NextResponse.json({ error: 'Impossible de vérifier votre abonnement pour le moment.' }, { status: 500 });
    }
    if (!subscribed) {
      return NextResponse.json(
        { error: 'Cette lecture nécessite un abonnement actif.', code: 'SUBSCRIPTION_REQUIRED' },
        { status: 402 }
      );
    }
  }

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
  // Les informations de naissance du profil (et, quand résolu, le thème
  // natal réel qui en découle — voir lib/natal.ts) sont désormais fournies à
  // toutes les lectures basées sur le profil de l'utilisateur, pas
  // seulement aux trois historiques (thème astral, grande analyse,
  // horoscope personnalisé) : chaque générateur décide lui-même s'il en a
  // l'usage, et n'affiche/n'utilise l'ascendant et la lune natale que
  // lorsqu'ils ont pu être réellement calculés.
  const naissance = {
    date: profile.date_naissance,
    heure: profile.heure_naissance ? profile.heure_naissance.slice(0, 5) : undefined,
    lieu: profile.lieu_naissance,
    latitude: profile.lieu_latitude,
    longitude: profile.lieu_longitude,
    timezone: profile.lieu_timezone,
  };

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
    if (isThemeKey(feature)) {
      reading = await generateThematic({ theme: feature, sign, seedKey: dateISO, naissance });
    } else {
      switch (feature) {
        case 'theme_astral_complet':
          reading = await generateAstralChart({ sign, naissance });
          break;
        case 'analyse_sentimentale':
          reading = await generateSentiment({ sign, weekKey: isoWeekKey(new Date()), naissance });
          break;
        case 'compatibilite_amoureuse': {
          const compat = await generateCompatibility({
            prenom: profile.prenom,
            sign,
            dateNaissance: profile.date_naissance,
            naissance,
            autrePrenom,
            autreSign: autreSign!,
            autreDateNaissance: autreDate,
            seedKey: dateISO.slice(0, 7),
          });
          // Les deux prénoms et le second signe sont stockés avec la
          // lecture : indispensable pour pouvoir la réafficher à
          // l'identique dans l'historique plus tard.
          reading = {
            ...compat,
            moiPrenom: profile.prenom,
            autreSigne: { key: autreSign!.key, nom: autreSign!.nom, symbole: autreSign!.symbole, prenom: autrePrenom },
          };
          break;
        }
        case 'grande_analyse':
          reading = await generateGrandeAnalyse({ sign, naissance });
          break;
        case 'cycle_lunaire':
          reading = await generateLunarCycle({ sign, naissance });
          break;
        case 'transits_planetaires':
          reading = await generateTransits({ sign, naissance });
          break;
        default:
          reading = await generateHoroscope({ feature, sign, dateISO, naissance });
      }
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
