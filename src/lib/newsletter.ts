// Newsletter hebdomadaire — envoyée à tous les utilisateurs inscrits
// (opt-out, pas opt-in : voir profiles.newsletter_opt_in) à partir des
// actualités publiées dans les 7 derniers jours. Envoyée via Resend (déjà
// utilisé pour les e-mails de connexion), déclenchée chaque semaine par un
// scénario Make.com qui appelle /api/newsletter/send-weekly.

import crypto from 'crypto';
import { requireDb } from './db';
import { getRecentPublishedNews } from './news';

const RESEND_API_URL = 'https://api.resend.com/emails';

function unsubscribeSecret(): string {
  // Réutilise le secret d'automatisation existant plutôt que d'ajouter une
  // variable d'environnement supplémentaire — usage différent (HMAC, pas
  // d'authentification d'appel), risque nul de collision.
  return process.env.SOCIAL_AUTOMATION_SECRET || process.env.AUTH_RESEND_KEY || 'horosphere-newsletter-fallback';
}

export function unsubscribeToken(userId: number): string {
  return crypto.createHmac('sha256', unsubscribeSecret()).update(String(userId)).digest('hex').slice(0, 32);
}

export function verifyUnsubscribeToken(userId: number, token: string): boolean {
  const expected = unsubscribeToken(userId);
  if (expected.length !== token.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

export async function setNewsletterOptIn(userId: number, optIn: boolean): Promise<void> {
  const sql = requireDb();
  await sql`UPDATE profiles SET newsletter_opt_in = ${optIn}, updated_at = now() WHERE user_id = ${userId}`;
}

type Recipient = { id: number; email: string; prenom: string };

async function getNewsletterRecipients(): Promise<Recipient[]> {
  const sql = requireDb();
  return sql<Recipient[]>`
    SELECT u.id, u.email, p.prenom
    FROM users u
    JOIN profiles p ON p.user_id = u.id
    WHERE u.email IS NOT NULL AND p.newsletter_opt_in = true
  `;
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://horosphere-live.vercel.app').replace(/\/$/, '');
}

function buildEmailHtml(prenom: string, items: Awaited<ReturnType<typeof getRecentPublishedNews>>, userId: number): string {
  const base = siteUrl();
  const unsubUrl = `${base}/api/newsletter/unsubscribe?uid=${userId}&token=${unsubscribeToken(userId)}`;
  const articles = items
    .map(
      (n) => `
        <tr><td style="padding:16px 0;border-top:1px solid #e5e0d8;">
          <div style="font-family:Georgia,serif;font-size:18px;margin-bottom:6px;">
            <a href="${base}/actualites/${n.slug}" style="color:#1a1a1a;text-decoration:none;">${n.titre}</a>
          </div>
          ${n.resume ? `<div style="font-size:14px;color:#6b6b6b;">${n.resume}</div>` : ''}
        </td></tr>`
    )
    .join('');

  return `
    <table width="100%" style="max-width:560px;margin:0 auto;font-family:Arial,sans-serif;color:#1a1a1a;">
      <tr><td style="padding-bottom:20px;">
        <div style="font-family:Georgia,serif;font-style:italic;font-size:22px;">Horosphère</div>
      </td></tr>
      <tr><td style="padding-bottom:10px;font-size:15px;">Bonjour ${prenom || ''},</td></tr>
      <tr><td style="padding-bottom:16px;font-size:15px;">Voici ce qui s'est passé cette semaine :</td></tr>
      ${articles}
      <tr><td style="padding-top:28px;font-size:12px;color:#9a9a9a;">
        Vous recevez cet e-mail car vous êtes inscrit·e sur Horosphère.
        <a href="${unsubUrl}" style="color:#9a9a9a;">Se désinscrire de la newsletter</a>.
      </td></tr>
    </table>`;
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

export type NewsletterResult = { sent: number; skipped: 'no-news' | null; recipients: number };

/** Envoie la newsletter hebdomadaire. Ne renvoie rien si aucune actualité
 * n'a été publiée cette semaine — mieux vaut ne pas écrire plutôt qu'un
 * e-mail vide. Les échecs individuels n'interrompent pas l'envoi aux
 * autres destinataires. */
export async function sendWeeklyNewsletter(): Promise<NewsletterResult> {
  const apiKey = process.env.AUTH_RESEND_KEY || process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Aucune clé Resend configurée (AUTH_RESEND_KEY / RESEND_API_KEY).");
  const from = process.env.EMAIL_FROM || 'Horosphère <onboarding@resend.dev>';

  const items = await getRecentPublishedNews(7);
  if (items.length === 0) {
    return { sent: 0, skipped: 'no-news', recipients: 0 };
  }

  const recipients = await getNewsletterRecipients();
  let sent = 0;
  for (const r of recipients) {
    try {
      const html = buildEmailHtml(r.prenom, items, r.id);
      await sendViaResend(apiKey, from, r.email, `Horosphère — l'actualité de la semaine`, html);
      sent += 1;
    } catch (err) {
      console.error(`Envoi newsletter échoué pour l'utilisateur ${r.id}`, err);
    }
  }
  return { sent, skipped: null, recipients: recipients.length };
}
