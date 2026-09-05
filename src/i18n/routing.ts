import { defineRouting } from 'next-intl/routing';

// Français par défaut, sans préfixe d'URL (horosphere.fr reste tel quel) ;
// l'anglais vit sous /en (horosphere.fr/en/...). D'autres langues pourront
// s'ajouter ici plus tard sans toucher au reste du routage.
export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'as-needed',
});

export type AppLocale = (typeof routing.locales)[number];
