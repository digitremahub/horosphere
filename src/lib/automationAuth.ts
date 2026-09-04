// Vérifie le secret partagé utilisé par les appels automatisés (scénarios
// Make.com) vers l'API de l'application — génération de contenu réseaux,
// publication d'actualités, envoi de la newsletter. Aucune session
// utilisateur n'est requise pour ces routes : c'est Make qui appelle,
// jamais un navigateur.

import { NextRequest } from 'next/server';

export function hasValidAutomationSecret(req: NextRequest): boolean {
  const secret = process.env.SOCIAL_AUTOMATION_SECRET;
  if (!secret) return false;
  return req.headers.get('x-automation-secret') === secret;
}
