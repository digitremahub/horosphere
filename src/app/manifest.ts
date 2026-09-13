import type { MetadataRoute } from 'next';

// Manifeste PWA — statique (pas de variante par langue : le nom d'une appli
// installée ne change pas dynamiquement une fois sur l'écran d'accueil).
// Texte en français, langue par défaut du site (voir src/i18n/routing.ts).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Horosphère — le développement personnel par les astres',
    short_name: 'Horosphère',
    description:
      'Chaque jour, une lecture astrologique courte et une action concrète pour avancer. Généré par IA, personnalisé à votre profil.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    lang: 'fr',
    background_color: '#F8E9DD', // --aube : fond crème de l'écran de démarrage
    theme_color: '#A64E36', // --lever-profond : couleur de la marque
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
