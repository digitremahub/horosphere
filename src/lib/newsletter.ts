// Newsletter hebdomadaire — envoyée à tous les utilisateurs inscrits
// (opt-out, pas opt-in : voir profiles.newsletter_opt_in) à partir des
// actualités publiées dans les 7 derniers jours. Envoyée via Resend (déjà
// utilisé pour les e-mails de connexion), déclenchée chaque semaine par un
// scénario Make.com qui appelle /api/newsletter/send-weekly.

import crypto from 'crypto';
import { requireDb } from './db';
import { getRecentPublishedNews, splitArticleSections, type NewsItem } from './news';
import { callClaude } from './anthropic';
import { SIGNS } from './zodiac';

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

// Premier paragraphe du corps de l'article (hors section "Signes les plus
// concernés", voir splitArticleSections) — donne un vrai aperçu du contenu
// dans l'e-mail plutôt que la seule phrase de résumé, qui à elle seule
// rendait la newsletter trop maigre quand un seul article est disponible
// dans la semaine (retour utilisateur du 25/09).
const EXTRAIT_MAX = 420;
function extraitArticle(contenu: string): string {
  const { corps } = splitArticleSections(contenu);
  const premierParagraphe = corps.split(/\n\s*\n/)[0]?.trim() ?? '';
  if (premierParagraphe.length <= EXTRAIT_MAX) return premierParagraphe;
  return `${premierParagraphe.slice(0, EXTRAIT_MAX).trim()}…`;
}

type SignImpact = { nom: string; symbole: string; texte: string };

/** Une phrase par signe expliquant ce que l'actualité de la semaine change
 * concrètement pour lui — calculée UNE SEULE FOIS par envoi (pas par
 * destinataire) et partagée par tous les e-mails de la même newsletter,
 * plutôt que refaire 12 signes × N destinataires d'appels IA. Demande
 * explicite de l'utilisateur (25/09) : la newsletter avait trop peu de
 * matière avec un seul article et sa phrase de résumé. */
async function generateSignImpacts(items: NewsItem[]): Promise<SignImpact[]> {
  const corpus = items.map((n) => splitArticleSections(n.contenu).corps).join('\n\n---\n\n');
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return SIGNS.map((s) => ({ nom: s.nom, symbole: s.symbole, texte: "Observez ce qui, dans votre semaine, résonne avec cette actualité du ciel." }));
  }
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
  const nomsSignes = SIGNS.map((s) => s.nom);
  const prompt = `Voici l'actualité du ciel d'Horosphère cette semaine :\n\n${corpus}\n\nPour CHACUN des 12 signes du zodiaque (${nomsSignes.join(', ')}), écris UNE phrase dense expliquant ce que cette actualité change concrètement pour ce signe précis cette semaine — jamais une généralité qui vaudrait pour n'importe quel signe : nomme son élément ou sa planète maîtresse et l'implication pratique qui en découle. Ton direct et actionnable, jamais fataliste.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, avec exactement une clé par signe nommée comme dans la liste ci-dessus, par exemple : { "Bélier": "...", "Taureau": "...", ... }`;
  try {
    const parsed = await callClaude(apiKey, model, prompt, 1400);
    return SIGNS.map((s) => ({ nom: s.nom, symbole: s.symbole, texte: String(parsed[s.nom] ?? '').trim() || "Observez ce qui, dans votre semaine, résonne avec cette actualité du ciel." }));
  } catch (err) {
    console.error('generateSignImpacts failed, using generic fallback', err);
    return SIGNS.map((s) => ({ nom: s.nom, symbole: s.symbole, texte: "Observez ce qui, dans votre semaine, résonne avec cette actualité du ciel." }));
  }
}

function buildEmailHtml(prenom: string, items: NewsItem[], signImpacts: SignImpact[], userId: number): string {
  const base = siteUrl();
  const unsubUrl = `${base}/api/newsletter/unsubscribe?uid=${userId}&token=${unsubscribeToken(userId)}`;
  const articles = items
    .map(
      (n) => `
        <tr><td style="padding:16px 0;border-top:1px solid #e5e0d8;">
          <div style="font-family:Georgia,serif;font-size:18px;margin-bottom:6px;">
            <a href="${base}/actualites/${n.slug}" style="color:#1a1a1a;text-decoration:none;">${n.titre}</a>
          </div>
          ${n.resume ? `<div style="font-size:14px;color:#6b6b6b;margin-bottom:8px;">${n.resume}</div>` : ''}
          <div style="font-size:14px;line-height:1.5;">${extraitArticle(n.contenu)}</div>
        </td></tr>`
    )
    .join('');

  const signes = signImpacts
    .map(
      (s) => `
        <tr><td style="padding:10px 0;border-top:1px solid #e5e0d8;">
          <div style="font-size:14px;"><strong>${s.symbole} ${s.nom}</strong> — ${s.texte}</div>
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
      <tr><td style="padding-top:28px;padding-bottom:8px;font-family:Georgia,serif;font-size:17px;">Ce que ça change pour vous, signe par signe</td></tr>
      ${signes}
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

  const signImpacts = await generateSignImpacts(items);
  const recipients = await getNewsletterRecipients();
  let sent = 0;
  for (const r of recipients) {
    try {
      const html = buildEmailHtml(r.prenom, items, signImpacts, r.id);
      await sendViaResend(apiKey, from, r.email, `Horosphère — l'actualité de la semaine`, html);
      sent += 1;
    } catch (err) {
      console.error(`Envoi newsletter échoué pour l'utilisateur ${r.id}`, err);
    }
  }
  return { sent, skipped: null, recipients: recipients.length };
}
