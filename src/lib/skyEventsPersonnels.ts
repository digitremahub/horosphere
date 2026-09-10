// Impact personnalisé des prochains événements du ciel (nouvelle/pleine
// lune, éclipses) selon le signe du compte connecté — répond à "ce que ça
// va changer pour moi", pas seulement une date à cocher. Même technique des
// 3 aspects durs que lib/aspects.ts (conjonction/opposition/carré) :
// l'événement est situé dans un signe (celui de la Lune à cet instant précis
// — voir lib/skyEvents.ts), comparé au signe de la personne.

import { signesLesPlusImpactes, type Aspect } from './aspects';
import type { SkyEvent } from './skyEvents';

const THEME_EVENEMENT: Record<string, string> = {
  'nouvelle-lune': "un nouveau cycle qui s'ouvre — le bon moment pour poser une intention claire",
  'pleine-lune': 'un aboutissement, une clarté qui arrive sur quelque chose déjà engagé',
  'eclipse-lunaire': 'une bascule plus marquée qu\'une pleine lune ordinaire — une fin qui libère de la place',
  'eclipse-solaire': "un déclic plus marqué qu'une nouvelle lune ordinaire — un vrai coup d'accélérateur",
};

const TWIST_ASPECT: Record<Aspect, string> = {
  conjonction: 'en prise directe pour vous',
  opposition: 'en miroir pour vous, plutôt du côté de vos relations',
  carre: 'en friction active pour vous, de quoi pousser à ajuster quelque chose',
};

/** `null` si le type d'événement n'a pas d'interprétation prévue, ou si le
 * signe de l'événement n'a pas pu être déterminé. */
export function interpretationPersonnelle(event: SkyEvent, signeUtilisateurKey: string): string | null {
  const theme = THEME_EVENEMENT[event.key];
  if (!theme || !event.signeKey) return null;

  const impactes = signesLesPlusImpactes(event.signeKey);
  const trouve = impactes.find((i) => i.signe.key === signeUtilisateurKey);
  const twist = trouve ? TWIST_ASPECT[trouve.aspect] : 'plus en douceur pour vous, sans tension marquée';

  return `Pour vous : ${theme} — ${twist}.`;
}
