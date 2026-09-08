// Calendrier de l'avent — stratégie d'acquisition : une case par jour du 1er
// au 24 décembre, réclamable une seule fois par utilisateur CONNECTÉ (pas de
// vérification des réseaux sociaux — Meta ne permet pas de vérifier
// automatiquement qu'un utilisateur suit un compte ou a commenté, voir la
// discussion produit). Le vrai levier d'acquisition est là : il faut un
// compte Horosphère pour réclamer, chaque jour ramène donc du trafic ET de
// l'inscription. Pas de rattrapage — une case non réclamée le jour même est
// perdue, comme un vrai calendrier de l'avent.
//
// Quatre types de récompense, mélangés sur les 24 jours (voir
// PROGRAMME_AVENT) :
// - credits    : crédits ajoutés directement au compte.
// - parrainage : révèle le lien de parrainage personnel de l'utilisateur
//   (voir lib/referral.ts) — les crédits arrivent plus tard, quand un ami
//   s'inscrit réellement via ce lien.
// - reduction  : un code promo Stripe PARTAGÉ par tous ceux qui ouvrent
//   cette case, mais dont Stripe lui-même limite l'usage à 20 (max_redemptions)
//   — pas de compteur maison à maintenir.
// - tirage     : réservé aux abonnés actifs (pour éviter un grand prix
//   "abonnement offert" gagné par quelqu'un sans abonnement) — inscrit
//   l'utilisateur au tirage au sort du 24 décembre (1 an offert, voir
//   /api/admin/tirage-avent) ; les non-abonnés reçoivent une consolation en
//   crédits à la place.

import { requireDb } from './db';
import { grantCredits, hasActiveSubscription } from './credits';
import { CREDIT_EXPIRY_DAYS } from './pricing';
import { stripeClient } from './stripe';
import { lienParrainage } from './referral';

export type RecompenseAvent =
  | { type: 'credits'; credits: number }
  | { type: 'parrainage' }
  | { type: 'reduction' }
  | { type: 'tirage' };

// Un type de récompense par jour (index 0 = 1er décembre ... index 23 = 24
// décembre) — volontairement simple à ajuster ici, sans toucher au reste de
// la logique.
export const PROGRAMME_AVENT: RecompenseAvent[] = [
  { type: 'credits', credits: 1 },
  { type: 'credits', credits: 1 },
  { type: 'credits', credits: 1 },
  { type: 'credits', credits: 2 },
  { type: 'parrainage' },
  { type: 'credits', credits: 1 },
  { type: 'credits', credits: 1 },
  { type: 'credits', credits: 2 },
  { type: 'credits', credits: 1 },
  { type: 'reduction' },
  { type: 'credits', credits: 1 },
  { type: 'credits', credits: 3 },
  { type: 'credits', credits: 1 },
  { type: 'credits', credits: 1 },
  { type: 'parrainage' },
  { type: 'credits', credits: 2 },
  { type: 'credits', credits: 1 },
  { type: 'credits', credits: 1 },
  { type: 'reduction' },
  { type: 'credits', credits: 2 },
  { type: 'credits', credits: 1 },
  { type: 'credits', credits: 1 },
  { type: 'credits', credits: 1 },
  { type: 'tirage' }, // 24 décembre — grand tirage au sort
];

const POURCENTAGE_REDUCTION = 20;
const MAX_UTILISATIONS_REDUCTION = 20;
const CREDITS_CONSOLATION_TIRAGE = 2;

function jourEtAnneeCourants(): { mois: number; jour: number; annee: number } {
  const now = new Date();
  return { mois: now.getUTCMonth() + 1, jour: now.getUTCDate(), annee: now.getUTCFullYear() };
}

/** Le calendrier lui-même n'ouvre que le 1er décembre, mais on cache toute
 * trace de son existence (lien de navigation, page) avant le 20 novembre —
 * le temps que la déco de Noël du site soit prête. Visible du 20 novembre
 * au 31 décembre, caché le reste de l'année. */
export function estPeriodeVisibleAvent(date: Date = new Date()): boolean {
  const mois = date.getUTCMonth() + 1;
  const jour = date.getUTCDate();
  return (mois === 11 && jour >= 20) || mois === 12;
}

export type StatutAvent = {
  actif: boolean; // true seulement en décembre, du 1er au 24
  jourDuJour: number; // 0 si `actif` est faux
  joursReclames: number[]; // jours (1-24) déjà réclamés cette année
};

export async function statutAvent(userId: number): Promise<StatutAvent> {
  const { mois, jour, annee } = jourEtAnneeCourants();
  const actif = mois === 12 && jour <= 24;

  const sql = requireDb();
  const rows = await sql<{ day: number }[]>`
    SELECT day FROM advent_claims WHERE user_id = ${userId} AND year = ${annee}
  `;

  return { actif, jourDuJour: actif ? jour : 0, joursReclames: rows.map((r) => r.day) };
}

// Code promo unique par année de campagne — le même pour tout le monde,
// c'est Stripe (max_redemptions) qui fait respecter la limite de 20
// utilisations réelles, pas un compteur maison.
async function obtenirOuCreerCodePromoAvent(annee: number): Promise<string> {
  const code = `AVENT${annee}`;
  const stripe = stripeClient();
  const existants = await stripe.promotionCodes.list({ code, limit: 1 });
  if (existants.data[0]) return existants.data[0].code;

  const coupon = await stripe.coupons.create({
    percent_off: POURCENTAGE_REDUCTION,
    duration: 'once',
    name: `Calendrier de l'avent ${annee}`,
  });
  const promo = await stripe.promotionCodes.create({
    coupon: coupon.id,
    code,
    max_redemptions: MAX_UTILISATIONS_REDUCTION,
  });
  return promo.code;
}

export type ReclamationAvent =
  | { ok: true; jour: number; recompense: RecompenseAvent; lienParrainage?: string; codePromo?: string; consolation?: boolean }
  | { ok: false; raison: 'hors-periode' | 'deja-reclame' };

export async function reclamerCadeauAvent(userId: number): Promise<ReclamationAvent> {
  const { mois, jour, annee } = jourEtAnneeCourants();
  if (mois !== 12 || jour > 24) {
    return { ok: false, raison: 'hors-periode' };
  }

  const recompensePrevue = PROGRAMME_AVENT[jour - 1] ?? { type: 'credits', credits: 1 };
  const sql = requireDb();

  // La case n'est réservée qu'une fois — même logique quel que soit le
  // type de récompense (le compteur `credits` reste utile pour l'historique
  // même quand la vraie récompense n'est pas des crédits : 0 sinon).
  const creditsColonne = recompensePrevue.type === 'credits' ? recompensePrevue.credits : 0;
  const inserted = await sql`
    INSERT INTO advent_claims (user_id, year, day, credits)
    VALUES (${userId}, ${annee}, ${jour}, ${creditsColonne})
    ON CONFLICT (user_id, year, day) DO NOTHING
    RETURNING user_id
  `;
  if (inserted.length === 0) {
    return { ok: false, raison: 'deja-reclame' };
  }

  switch (recompensePrevue.type) {
    case 'credits': {
      await grantCredits(userId, recompensePrevue.credits, `avent:${annee}:${jour}`, CREDIT_EXPIRY_DAYS);
      return { ok: true, jour, recompense: recompensePrevue };
    }

    case 'parrainage': {
      return { ok: true, jour, recompense: recompensePrevue, lienParrainage: lienParrainage(userId) };
    }

    case 'reduction': {
      const codePromo = await obtenirOuCreerCodePromoAvent(annee);
      return { ok: true, jour, recompense: recompensePrevue, codePromo };
    }

    case 'tirage': {
      const estAbonne = await hasActiveSubscription(userId);
      if (!estAbonne) {
        // Grand prix réservé aux abonnés (sinon "1 an offert" n'a pas de
        // sens) — consolation en crédits pour tout le monde d'autre.
        await grantCredits(userId, CREDITS_CONSOLATION_TIRAGE, `avent:${annee}:${jour}:consolation`, CREDIT_EXPIRY_DAYS);
        return { ok: true, jour, recompense: { type: 'credits', credits: CREDITS_CONSOLATION_TIRAGE }, consolation: true };
      }
      await sql`
        INSERT INTO tirage_avent (user_id, year) VALUES (${userId}, ${annee})
        ON CONFLICT (user_id, year) DO NOTHING
      `;
      return { ok: true, jour, recompense: recompensePrevue };
    }
  }
}

/** Script de la vidéo avatar du 25 décembre : annonce le gagnant du tirage
 * au sort et souhaite un joyeux Noël à tous — soumise automatiquement par
 * /api/admin/tirage-avent juste après le tirage (voir soumettreAvatarVideo,
 * lib/heygen.ts). Pas besoin d'IA ici : un seul texte, une fois par an,
 * jamais republié ni comparé à une version précédente. */
export function scriptVideoNoel(prenomGagnant: string): string {
  return `Joyeux Noël à toute la communauté Horosphère ! Cette année encore, les astres ont brillé pour beaucoup d'entre vous, et aujourd'hui, c'est le grand jour du tirage au sort de notre calendrier de l'avent. Et le grand gagnant, celui ou celle qui remporte une année d'abonnement offerte, c'est... ${prenomGagnant} ! Félicitations ! Merci à toutes celles et ceux qui ont participé, jour après jour, tout au long de ce mois de décembre. Que cette nouvelle année soit pleine de clarté, d'action, et de belles surprises. Joyeux Noël, et à très vite sur Horosphère.`;
}
