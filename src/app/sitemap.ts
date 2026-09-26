// sitemap.xml — absent jusqu'ici (voir l'audit organique du 26/09) : sans
// lui, Google découvre le site au hasard des liens plutôt que par un plan
// explicite. Couvre les pages publiques statiques (dans les 3 langues via
// `alternates.languages`) et référence chaque actualité publiée.
//
// Limite connue : une actualité n'a pas de route dédiée (elle vit derrière
// /actualites?a=slug, voir lib/news.ts) — on la référence quand même ici en
// attendant une vraie route /actualites/[slug] (voir la feuille de route
// SEO), plutôt que de ne pas la lister du tout.
import { MetadataRoute } from 'next';
import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { dbConfigured } from '@/lib/db';
import { listPublishedNews } from '@/lib/news';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.horosphere.fr').replace(/\/$/, '');

const PAGES_PUBLIQUES = [
  '/',
  '/actualites',
  '/actualites/tous',
  '/tarifs',
  '/faq',
  '/cgv',
  '/mentions-legales',
  '/politique-de-confidentialite',
] as const;

function urlLocalisees(chemin: string): Record<string, string> {
  return Object.fromEntries(
    routing.locales.map((locale) => [locale, `${SITE_URL}${getPathname({ href: chemin, locale })}`])
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entrees: MetadataRoute.Sitemap = PAGES_PUBLIQUES.map((chemin) => ({
    url: `${SITE_URL}${getPathname({ href: chemin, locale: routing.defaultLocale })}`,
    alternates: { languages: urlLocalisees(chemin) },
  }));

  if (dbConfigured) {
    const news = await listPublishedNews(100).catch(() => []);
    for (const item of news) {
      entrees.push({
        url: `${SITE_URL}/actualites?a=${encodeURIComponent(item.slug)}`,
        lastModified: item.publie_le ?? undefined,
      });
    }
  }

  return entrees;
}
