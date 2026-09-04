// Deux mécanismes d'accès distincts pour le pipeline de contenu réseaux
// sociaux :
// - un secret partagé pour les appels automatisés (Make.com génère le
//   contenu du jour, récupère les posts approuvés, confirme la publication)
// - une liste d'e-mails admin pour la validation humaine (/admin/social) —
//   c'est un utilisateur normal de l'app, authentifié comme les autres, mais
//   dont l'adresse figure dans ADMIN_EMAILS.

import { NextRequest } from 'next/server';

export function hasValidAutomationSecret(req: NextRequest): boolean {
  const secret = process.env.SOCIAL_AUTOMATION_SECRET;
  if (!secret) return false;
  return req.headers.get('x-automation-secret') === secret;
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS || 'digitrema@gmail.com')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}
