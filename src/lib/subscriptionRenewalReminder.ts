// Rappel avant le renouvellement d'un abonnement — décision explicite de
// l'utilisateur : prévenir quelques jours avant le prélèvement pour que la
// personne s'assure d'avoir les fonds/un moyen de paiement à jour, plutôt
// qu'une coupure surprise de service. Tourné en accroche marketing (ce que
// la personne continue de recevoir), jamais en simple notification de
// facturation.
//
// Un seul rappel par période de facturation : `rappel_renouvellement_periode`
// retient la date de fin de période déjà notifiée, pour ne jamais relancer
// deux fois pour le même renouvellement même si le cron tourne chaque jour.

import { requireDb } from './db';
import { SUBSCRIPTIONS } from './pricing';

const RESEND_API_URL = 'https://api.resend.com/emails';

// Fenêtre d'anticipation du rappel — décision explicite ("quelques jours
// avant"), alignée sur la fenêtre de tolérance déjà utilisée ailleurs
// (hasActiveSubscription) pour rester cohérent.
export const JOURS_AVANT_RENOUVELLEMENT = 3;

let colonneEnsured = false;

async function ensureColonne(sql: ReturnType<typeof requireDb>): Promise<void> {
  if (colonneEnsured) return;
  await sql.unsafe(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS rappel_renouvellement_periode TIMESTAMPTZ`);
  colonneEnsured = true;
}

type AbonnementARappeler = {
  id: string;
  user_id: number;
  email: string;
  prenom: string | null;
  plan_slug: string;
  current_period_end: string;
};

async function listerAbonnementsARappeler(): Promise<AbonnementARappeler[]> {
  const sql = requireDb();
  await ensureColonne(sql);
  return sql<AbonnementARappeler[]>`
    SELECT s.id, s.user_id, u.email, p.prenom, s.plan_slug, s.current_period_end::text AS current_period_end
    FROM subscriptions s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN profiles p ON p.user_id = s.user_id
    WHERE s.status = 'active'
      AND u.email IS NOT NULL
      AND s.current_period_end IS NOT NULL
      AND s.current_period_end <= now() + (${JOURS_AVANT_RENOUVELLEMENT} || ' days')::interval
      AND s.current_period_end > now()
      AND (s.rappel_renouvellement_periode IS NULL OR s.rappel_renouvellement_periode != s.current_period_end)
  `;
}

async function sendViaResend(apiKey: string, from: string, to: string, subject: string, html: string): Promise<void> {
  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend a refusé l'envoi (${res.status}): ${detail.slice(0, 300)}`);
  }
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://horosphere-live.vercel.app').replace(/\/$/, '');
}

function buildEmailHtml(prenom: string | null, planNom: string, creditsParMois: number, dateRenouvellement: string): string {
  const base = siteUrl();
  return `
    <table width="100%" style="max-width:560px;margin:0 auto;font-family:Arial,sans-serif;color:#1a1a1a;">
      <tr><td style="padding-bottom:20px;">
        <div style="font-family:Georgia,serif;font-style:italic;font-size:22px;">Horosphère</div>
      </td></tr>
      <tr><td style="padding-bottom:10px;font-size:15px;">Bonjour ${prenom || ''},</td></tr>
      <tr><td style="padding-bottom:18px;font-family:Georgia,serif;font-size:19px;">Le ciel continue de vous guider — votre rituel Horosphère se renouvelle dans ${JOURS_AVANT_RENOUVELLEMENT} jours ✨</td></tr>
      <tr><td style="padding-bottom:14px;font-size:15px;">
        Votre abonnement <strong>${planNom}</strong> se renouvelle le <strong>${dateRenouvellement}</strong>, avec ${creditsParMois} nouveaux crédits pour continuer vos lectures — horoscope du jour, thème natal, guidance...
      </td></tr>
      <tr><td style="padding-bottom:24px;font-size:15px;">
        Pour ne pas interrompre votre rituel, pensez à vérifier que votre moyen de paiement est bien à jour avant cette date.
      </td></tr>
      <tr><td style="padding-bottom:24px;">
        <a href="${base}/app/profil" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-size:14px;">Gérer mon abonnement</a>
      </td></tr>
      <tr><td style="padding-top:8px;font-size:12px;color:#9a9a9a;">
        Vous recevez cet e-mail car votre abonnement Horosphère est actif. Vous pouvez le résilier à tout moment depuis <a href="${base}/app/profil" style="color:#9a9a9a;">votre profil</a>.
      </td></tr>
    </table>`;
}

export type RappelRenouvellementResult = { envoyes: number; echecs: number; total: number };

export async function envoyerRappelsRenouvellement(): Promise<RappelRenouvellementResult> {
  const apiKey = process.env.AUTH_RESEND_KEY || process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Aucune clé Resend configurée (AUTH_RESEND_KEY / RESEND_API_KEY).");
  const from = process.env.EMAIL_FROM || 'Horosphère <onboarding@resend.dev>';

  const sql = requireDb();
  const abonnements = await listerAbonnementsARappeler();
  let envoyes = 0;
  let echecs = 0;

  for (const a of abonnements) {
    try {
      const plan = SUBSCRIPTIONS.find((s) => s.slug === a.plan_slug);
      const dateRenouvellement = new Date(a.current_period_end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
      const html = buildEmailHtml(a.prenom, plan?.nom ?? a.plan_slug, plan?.creditsParMois ?? 0, dateRenouvellement);

      await sendViaResend(apiKey, from, a.email, `Horosphère — votre renouvellement dans ${JOURS_AVANT_RENOUVELLEMENT} jours`, html);

      // Marqué comme rappelé APRÈS un envoi réussi seulement — un échec
      // laisse la porte ouverte à une nouvelle tentative le lendemain,
      // tant que la période n'est pas encore terminée.
      await sql`UPDATE subscriptions SET rappel_renouvellement_periode = ${a.current_period_end} WHERE id = ${a.id}`;
      envoyes += 1;
    } catch (err) {
      console.error(`Rappel de renouvellement échoué pour l'abonnement ${a.id}`, err);
      echecs += 1;
    }
  }

  return { envoyes, echecs, total: abonnements.length };
}
