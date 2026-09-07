// Liens vers les comptes réseaux sociaux officiels d'Horosphère — utilisés
// par le pied de page (icônes) et le carrousel de publications de la page
// d'accueil (voir components/SocialCarousel.tsx). TikTok n'existe pas
// encore : sa clé est volontairement absente plutôt que vide, pour que les
// composants qui itèrent dessus ne proposent jamais un lien mort.
export const SOCIAL_LINKS: Partial<Record<'instagram' | 'facebook' | 'tiktok', string>> = {
  instagram: 'https://www.instagram.com/horo_sphere',
  facebook: 'https://www.facebook.com/share/1A55f3TBs8/',
};
