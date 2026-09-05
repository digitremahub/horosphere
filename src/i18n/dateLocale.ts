// Code de locale Intl à utiliser pour toLocaleDateString(), à partir de la
// locale next-intl de la requête — évite de dupliquer la même ternaire dans
// chaque composant qui formate une date affichée à l'utilisateur.
export function dateLocaleTag(locale: string): string {
  if (locale === 'en') return 'en-US';
  if (locale === 'es') return 'es-ES';
  return 'fr-FR';
}
