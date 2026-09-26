// robots.txt — absent jusqu'ici (voir l'audit organique du 26/09) : sans ce
// fichier, un crawler ne sait même pas qu'un sitemap existe, et rien ne
// l'empêche d'indexer l'espace payant ou les routes techniques.
import { MetadataRoute } from 'next';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.horosphere.fr').replace(/\/$/, '');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // /app : espace payant, rien à indexer, y compris le backoffice /app/admin.
      // /api : routes techniques, jamais du contenu.
      // /r : liens courts de redirection utilisés dans les posts sociaux (voir
      // app/r/[code]/route.ts) — indexer le code plutôt que la vraie page
      // n'apporterait rien.
      disallow: ['/app/', '/api/', '/r/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
