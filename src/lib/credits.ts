import { requireDb } from './db';
import { CREDIT_EXPIRY_DAYS, FEATURE_COSTS, FeatureKey } from './pricing';

export class InsufficientCreditsError extends Error {
  constructor(public needed: number, public available: number) {
    super(`Crédits insuffisants : ${available} disponibles, ${needed} nécessaires.`);
  }
}

export async function getBalance(userId: number): Promise<number> {
  const sql = requireDb();
  const rows = await sql<{ total: string | null }[]>`
    SELECT SUM(credits_remaining) AS total
    FROM credit_lots
    WHERE user_id = ${userId}
      AND credits_remaining > 0
      AND (expires_at IS NULL OR expires_at > now())
  `;
  return Number(rows[0]?.total ?? 0);
}

/** Ajoute un lot de crédits (achat d'un pack, ou recharge d'abonnement). */
export async function grantCredits(userId: number, credits: number, source: string, expiresInDays: number | null) {
  const sql = requireDb();
  const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null;
  await sql`
    INSERT INTO credit_lots (user_id, credits_total, credits_remaining, source, expires_at)
    VALUES (${userId}, ${credits}, ${credits}, ${source}, ${expiresAt})
  `;
}

export async function grantPackCredits(userId: number, credits: number, packSlug: string) {
  return grantCredits(userId, credits, `pack:${packSlug}`, CREDIT_EXPIRY_DAYS);
}

export async function grantSubscriptionCredits(userId: number, credits: number, planSlug: string, periodLabel: string) {
  // Les crédits d'abonnement n'expirent pas individuellement : le cycle
  // suivant en apporte un nouveau lot. On ne les fait pas s'accumuler à
  // l'infini pour autant — voir resetSubscriptionCredits.
  return grantCredits(userId, credits, `sub:${planSlug}:${periodLabel}`, null);
}

/** Consomme des crédits pour une fonctionnalité, en épuisant d'abord les
 * lots qui expirent le plus tôt (FIFO par expiration). Lève
 * InsufficientCreditsError si le solde est trop bas — rien n'est débité
 * dans ce cas. `reading`, si fourni, est stocké tel quel (JSONB) pour
 * alimenter l'historique affiché à l'utilisateur (voir getHistory). */
export async function consumeCredits(userId: number, feature: FeatureKey, sign?: string, reading?: unknown) {
  const sql = requireDb();
  const cost = FEATURE_COSTS[feature];

  await sql.begin(async (tx) => {
    const lots = await tx<{ id: string; credits_remaining: number }[]>`
      SELECT id, credits_remaining
      FROM credit_lots
      WHERE user_id = ${userId}
        AND credits_remaining > 0
        AND (expires_at IS NULL OR expires_at > now())
      ORDER BY (expires_at IS NULL), expires_at ASC
      FOR UPDATE
    `;

    const available = lots.reduce((sum, l) => sum + l.credits_remaining, 0);
    if (available < cost) {
      throw new InsufficientCreditsError(cost, available);
    }

    let remaining = cost;
    for (const lot of lots) {
      if (remaining <= 0) break;
      const take = Math.min(lot.credits_remaining, remaining);
      await tx`UPDATE credit_lots SET credits_remaining = credits_remaining - ${take} WHERE id = ${lot.id}`;
      remaining -= take;
    }

    await tx`
      INSERT INTO credit_usage (user_id, feature, credits_spent, sign, reading)
      VALUES (${userId}, ${feature}, ${cost}, ${sign ?? null}, ${tx.json((reading ?? null) as any)})
    `;
  });
}

export type HistoryEntry = {
  id: string;
  feature: string;
  credits_spent: number;
  sign: string | null;
  created_at: string;
  reading: Record<string, unknown> | null;
};

/** Historique des lectures consommées par l'utilisateur, les plus récentes
 * en premier — alimente la page /app/historique. */
export async function getHistory(userId: number, limit = 30): Promise<HistoryEntry[]> {
  const sql = requireDb();
  return sql<HistoryEntry[]>`
    SELECT id, feature, credits_spent, sign, created_at, reading
    FROM credit_usage
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
}
