import { NextRequest, NextResponse } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { signFromBirthdate } from '@/lib/zodiac';
import { localizedSign } from '@/lib/zodiac-i18n';
import {
  generateHoroscope,
  generateAstralChart,
  generateSentiment,
  generateCompatibility,
  generateGrandeAnalyse,
  generateThematic,
  generateLunarCycle,
  generateTransits,
  type Langue,
} from '@/lib/anthropic';
import { consumeCredits, getBalance, hasActiveSubscription, hasGeneratedToday, InsufficientCreditsError } from '@/lib/credits';
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
  const body = await req.json().catch(() => ({}));
  const feature = body.feature as FeatureKey;
  const langue: Langue = body.locale === 'en' || body.locale === 'es' ? body.locale : 'fr';
  const t = await getTranslations({ locale: langue, namespace: 'ApiGenerate' });

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!session || !userId) {
    return NextResponse.json({ error: t('loginRequired') }, { status: 401 });
  }

  if (!dbConfigured) {
    return NextResponse.json({ error: t('dbNotConfigured') }, { status: 503 });
  }

  if (!feature || !(feature in FEATURE_COSTS)) {
    return NextResponse.json({ error: t('unknownFeature') }, { status: 400 });
  }
  if (!FEATURE_LABELS[feature].disponible) {
    return NextResponse.json({ error: t('comingSoon') }, { status: 400 });
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
      return NextResponse.json({ error: t('missingOtherPerson') }, { status: 400 });
    }
    // Même contrôle que le profil (retour testeur 09/09, date de naissance
    // acceptée dans le futur) — le champ a un `max` côté client, mais reste
    // contournable, donc revalidé ici.
    if (autreDate > new Date().toISOString().slice(0, 10)) {
      return NextResponse.json({ error: t('missingOtherPerson') }, { status: 400 });
    }
    autreSign = signFromBirthdate(Number(match[2]), Number(match[3]));
  }

  const uid = Number(userId);

  // Retour utilisateur : bloquer une régénération le même jour évitait le
  // double paiement accidentel, mais risquait de frustrer quelqu'un qui
  // veut vraiment refaire une lecture — remplacé par une confirmation
  // explicite (`confirmerRegeneration`, envoyé par le client seulement
  // après que la personne a confirmé le dialogue) plutôt qu'un blocage sec.
  const confirmerRegeneration = body.confirmerRegeneration === true;
  if (!confirmerRegeneration) {
    try {
      if (await hasGeneratedToday(uid, feature)) {
        return NextResponse.json(
          { error: t('alreadyGeneratedToday'), code: 'ALREADY_GENERATED_TODAY' },
          { status: 409 }
        );
      }
    } catch (err) {
      console.error('hasGeneratedToday failed', err);
      return NextResponse.json({ error: t('checkFailed') }, { status: 500 });
    }
  }

  // Certaines lectures (voir pricing.ts, subscriptionOnly) ne sont pas
  // ouvertes au paiement à la carte : il faut un abonnement actif, quel
  // que soit le solde de crédits.
  if (FEATURE_LABELS[feature].subscriptionOnly) {
    let subscribed = false;
    try {
      subscribed = await hasActiveSubscription(uid);
    } catch (err) {
      console.error('hasActiveSubscription failed', err);
      return NextResponse.json({ error: t('subscriptionCheckFailed') }, { status: 500 });
    }
    if (!subscribed) {
      return NextResponse.json(
        { error: t('subscriptionRequired'), code: 'SUBSCRIPTION_REQUIRED' },
        { status: 402 }
      );
    }
  }

  let profile;
  try {
    profile = await getProfile(uid);
  } catch (err) {
    console.error('getProfile failed', err);
    return NextResponse.json({ error: t('profileLoadFailed') }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json(
      { error: t('profileRequired'), code: 'PROFILE_REQUIRED' },
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
      { error: t('insufficientCredits', { balance, cost }), balance, needed: cost, code: 'INSUFFICIENT_CREDITS' },
      { status: 402 }
    );
  }

  const dateISO = new Date().toISOString().slice(0, 10);

  let reading;
  try {
    if (isThemeKey(feature)) {
      reading = await generateThematic({ theme: feature, sign, seedKey: dateISO, naissance, langue, prenom: profile.prenom });
    } else {
      switch (feature) {
        case 'theme_astral_complet':
          reading = await generateAstralChart({ sign, naissance, langue, prenom: profile.prenom });
          break;
        case 'analyse_sentimentale':
          reading = await generateSentiment({ sign, weekKey: isoWeekKey(new Date()), naissance, langue, prenom: profile.prenom });
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
            langue,
          });
          // Les deux prénoms et le second signe sont stockés avec la
          // lecture : indispensable pour pouvoir la réafficher à
          // l'identique dans l'historique plus tard.
          const autreSigneLocalise = localizedSign(autreSign!, langue);
          reading = {
            ...compat,
            moiPrenom: profile.prenom,
            autreSigne: { key: autreSigneLocalise.key, nom: autreSigneLocalise.nom, symbole: autreSigneLocalise.symbole, prenom: autrePrenom },
          };
          break;
        }
        case 'grande_analyse':
          reading = await generateGrandeAnalyse({ sign, naissance, langue, prenom: profile.prenom });
          break;
        case 'cycle_lunaire':
          reading = await generateLunarCycle({ sign, naissance, langue, dateISO, prenom: profile.prenom });
          break;
        case 'transits_planetaires':
          reading = await generateTransits({ sign, naissance, langue, dateISO, prenom: profile.prenom });
          break;
        default:
          reading = await generateHoroscope({ feature, sign, dateISO, naissance, langue, prenom: profile.prenom });
      }
    }
  } catch (err) {
    console.error('generation failed', err);
    return NextResponse.json({ error: t('generationFailed') }, { status: 502 });
  }

  try {
    await consumeCredits(uid, feature, sign.key, reading);
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: t('insufficientCredits', { balance: err.available, cost: err.needed }), code: 'INSUFFICIENT_CREDITS' },
        { status: 402 }
      );
    }
    console.error('consumeCredits failed', err);
    return NextResponse.json({ error: t('creditDebitFailed') }, { status: 500 });
  }

  const newBalance = await getBalance(uid);
  const signAffiche = localizedSign(sign, langue);

  return NextResponse.json({
    sign: { key: signAffiche.key, nom: signAffiche.nom, symbole: signAffiche.symbole, dates: signAffiche.dates, element: signAffiche.element, planete: signAffiche.planete },
    reading,
    balance: newBalance,
  });
}
