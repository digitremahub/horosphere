// E-mail du lien magique (connexion sans mot de passe) — Auth.js fournit un
// gabarit par défaut pour le provider Resend, mais entièrement en anglais et
// sans aucune awareness de la langue du site ("Sign in to horosphere.fr").
// On le remplace ici par un envoi direct à l'API Resend (même schéma que
// birthdayRefund.ts), avec un texte dans la langue de la page d'où la
// demande est partie.
//
// Détection de la langue : sendVerificationRequest ne reçoit pas la locale
// directement, seulement l'URL de vérification générée par Auth.js — celle-ci
// inclut le callbackUrl d'origine (ex. /en/app ou /es/app) en paramètre, dont
// le préfixe suffit à retrouver la langue (français par défaut, sans préfixe).

import type { EmailProviderSendVerificationRequestParams } from 'next-auth/providers/email';

const RESEND_API_URL = 'https://api.resend.com/emails';

type Locale = 'fr' | 'en' | 'es';

function detecterLocale(url: string): Locale {
  try {
    const demande = new URL(url);
    const callbackUrl = demande.searchParams.get('callbackUrl') || '';
    const chemin = new URL(callbackUrl, demande.origin).pathname;
    if (chemin.startsWith('/en')) return 'en';
    if (chemin.startsWith('/es')) return 'es';
  } catch {
    // URL malformée ou callbackUrl absent : on retombe sur le français.
  }
  return 'fr';
}

const TEXTES: Record<Locale, { subject: string; title: string; button: string; ignore: string }> = {
  fr: {
    subject: 'Votre lien de connexion Horosphère',
    title: 'Connexion à Horosphère',
    button: 'Se connecter',
    ignore: "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail sans risque.",
  },
  en: {
    subject: 'Your Horosphère sign-in link',
    title: 'Sign in to Horosphère',
    button: 'Sign in',
    ignore: "If you didn't request this, you can safely ignore this email.",
  },
  es: {
    subject: 'Tu enlace de acceso a Horosphère',
    title: 'Iniciar sesión en Horosphère',
    button: 'Iniciar sesión',
    ignore: 'Si no has solicitado este acceso, puedes ignorar este correo sin problema.',
  },
};

function buildHtml(locale: Locale, url: string): string {
  const t = TEXTES[locale];
  return `
    <table width="100%" style="max-width:560px;margin:0 auto;font-family:Arial,sans-serif;color:#1a1a1a;">
      <tr><td style="padding-bottom:20px;">
        <div style="font-family:Georgia,serif;font-style:italic;font-size:22px;">Horosphère</div>
      </td></tr>
      <tr><td style="padding-bottom:20px;font-size:17px;">${t.title}</td></tr>
      <tr><td style="padding-bottom:24px;">
        <a href="${url}" style="display:inline-block;padding:13px 28px;background:#1a1a1a;color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;">${t.button}</a>
      </td></tr>
      <tr><td style="padding-top:8px;font-size:12px;color:#9a9a9a;">${t.ignore}</td></tr>
    </table>`;
}

function buildText(locale: Locale, url: string): string {
  const t = TEXTES[locale];
  return `${t.title}\n${url}\n\n${t.ignore}`;
}

export async function envoyerLienMagique(params: EmailProviderSendVerificationRequestParams): Promise<void> {
  const { identifier: to, url, provider } = params;
  const apiKey = provider.apiKey;
  if (!apiKey) throw new Error('Clé Resend manquante');
  const from = provider.from || 'Horosphère <onboarding@resend.dev>';
  const locale = detecterLocale(url);
  const t = TEXTES[locale];

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from,
      to,
      subject: t.subject,
      html: buildHtml(locale, url),
      text: buildText(locale, url),
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend a refusé l'envoi du lien magique (${res.status}): ${detail.slice(0, 300)}`);
  }
}
