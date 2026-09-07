// Horoscope du jour envoyé par e-mail — opt-in explicite (voir
// profiles.horoscope_email_opt_in, décoché par défaut), déclenché chaque
// matin par un scénario Make.com qui appelle /api/horoscope/send-daily.
// Contrairement à la newsletter hebdomadaire (gratuite), cet envoi consomme
// un crédit par destinataire (feature horoscope_quotidien, voir
// pricing.ts) — exactement comme si l'utilisateur avait généré la lecture
// lui-même depuis le tableau de bord. Un solde insuffisant n'empêche pas
// les autres envois : on saute simplement ce destinataire ce jour-là (rien
// n'est débité, rien n'est envoyé), plutôt que de bloquer tout le lot ou de
// laisser un opt-in coché sans effet indéfiniment sans le signaler nulle
// part — voir `skippedInsufficientCredits` dans le résultat.

import { requireDb } from './db';
import { signFromBirthdate } from './zodiac';
import { generateHoroscope, type HoroscopeReading } from './anthropic';
import { consumeCredits, getBalance, InsufficientCreditsError } from './credits';
import { FEATURE_COSTS } from './pricing';

const RESEND_API_URL = 'https://api.resend.com/emails';

type Recipient = { id: number; email: string; prenom: string; date_naissance: string };

async function getOptedInRecipients(): Promise<Recipient[]> {
  const sql = requireDb();
  return sql<Recipient[]>`
    SELECT u.id, u.email, p.prenom, p.date_naissance::text AS date_naissance
    FROM users u
    JOIN profiles p ON p.user_id = u.id
    WHERE u.email IS NOT NULL AND p.horoscope_email_opt_in = true
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

function buildEmailHtml(prenom: string, signeNom: string, signeSymbole: string, reading: HoroscopeReading): string {
  const base = siteUrl();
  return `
    <table width="100%" style="max-width:560px;margin:0 auto;font-family:Arial,sans-serif;color:#1a1a1a;">
      <tr><td style="padding-bottom:20px;">
        <div style="font-family:Georgia,serif;font-style:italic;font-size:22px;">Horosphère</div>
      </td></tr>
      <tr><td style="padding-bottom:10px;font-size:15px;">Bonjour ${prenom || ''},</td></tr>
      <tr><td style="padding-bottom:6px;font-size:13px;color:#9a9a9a;text-transform:uppercase;letter-spacing:0.05em;">${signeSymbole} ${signeNom} — horoscope du jour</td></tr>
      <tr><td style="padding-bottom:18px;font-family:Georgia,serif;font-size:19px;">${reading.headline}</td></tr>
      <tr><td style="padding-bottom:14px;font-size:15px;"><strong>Amour</strong><br>${reading.amour}</td></tr>
      <tr><td style="padding-bottom:14px;font-size:15px;"><strong>Travail</strong><br>${reading.travail}</td></tr>
      <tr><td style="padding-bottom:14px;font-size:15px;"><strong>Énergie</strong><br>${reading.energie}</td></tr>
      <tr><td style="padding-bottom:20px;font-size:15px;"><strong>Conseil du jour</strong><br>${reading.conseil}</td></tr>
      <tr><td style="padding-bottom:24px;font-size:13px;color:#6b6b6b;">Couleur du jour : ${reading.couleur} · Chiffre : ${reading.chiffre} · Talisman : ${reading.talisman}</td></tr>
      <tr><td style="padding-top:8px;font-size:12px;color:#9a9a9a;">
        Vous recevez cet e-mail car vous avez activé l'envoi quotidien de votre horoscope dans
        <a href="${base}/app/profil" style="color:#9a9a9a;">votre profil Horosphère</a>, où vous pouvez le désactiver à tout moment.
      </td></tr>
    </table>`;
}

export type DailyHoroscopeResult = { sent: number; skippedInsufficientCredits: number; failed: number; recipients: number };

export async function sendDailyHoroscopeEmails(): Promise<DailyHoroscopeResult> {
  const apiKey = process.env.AUTH_RESEND_KEY || process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Aucune clé Resend configurée (AUTH_RESEND_KEY / RESEND_API_KEY).");
  const from = process.env.EMAIL_FROM || 'Horosphère <onboarding@resend.dev>';
  const cost = FEATURE_COSTS.horoscope_quotidien;
  const dateISO = new Date().toISOString().slice(0, 10);

  const recipients = await getOptedInRecipients();
  let sent = 0;
  let skippedInsufficientCredits = 0;
  let failed = 0;

  for (const r of recipients) {
    try {
      const balance = await getBalance(r.id);
      if (balance < cost) {
        skippedInsufficientCredits += 1;
        continue;
      }

      const [, m, d] = r.date_naissance.split('-').map(Number);
      const sign = signFromBirthdate(m, d);
      const reading = await generateHoroscope({ feature: 'horoscope_quotidien', sign, dateISO, langue: 'fr' });

      // Débite le crédit APRÈS une génération réussie mais AVANT l'envoi :
      // comme pour /api/generate, la lecture existe et compte comme
      // consommée dès qu'elle a été produite (elle apparaît dans
      // l'historique), même dans le cas rare où Resend échouerait ensuite —
      // cohérent avec le comportement déjà en place pour une génération
      // manuelle depuis le tableau de bord.
      await consumeCredits(r.id, 'horoscope_quotidien', sign.key, reading);

      const html = buildEmailHtml(r.prenom, sign.nom, sign.symbole, reading);
      await sendViaResend(apiKey, from, r.email, `Horosphère — votre horoscope du ${new Date(dateISO).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`, html);
      sent += 1;
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        // Course rare entre la vérification de solde ci-dessus et le débit
        // réel (ex. une autre consommation entre-temps) — même traitement
        // qu'un solde insuffisant détecté en amont.
        skippedInsufficientCredits += 1;
        continue;
      }
      console.error(`Envoi horoscope quotidien échoué pour l'utilisateur ${r.id}`, err);
      failed += 1;
    }
  }

  return { sent, skippedInsufficientCredits, failed, recipients: recipients.length };
}
