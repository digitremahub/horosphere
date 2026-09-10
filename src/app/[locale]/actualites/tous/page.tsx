import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { listPublishedNews, semaineLabel } from '@/lib/news';
import { dbConfigured } from '@/lib/db';
import { dateLocaleTag } from '@/i18n/dateLocale';
import { translatedTitles, type NewsLocale } from '@/lib/translate';

export const metadata = {
  title: 'Toutes les actualités — Horosphère',
};

// Mosaïque de TOUS les articles publiés, distincte de /actualites (qui reste
// la page "en direct" : astrolabe, lune du jour, compte à rebours, plus la
// lecture d'un article) — sur retour utilisateur, ces deux usages
// (survoler le ciel en direct / parcourir les archives) étaient mélangés
// sur une seule page, ce qui prêtait à confusion. Reliée depuis le carrousel
// de la page d'accueil et depuis /actualites (lien "Toutes les actualités").
export default async function TousLesArticlesPage() {
  const locale = await getLocale();
  const t = await getTranslations('Actualites');
  const dateLocale = dateLocaleTag(locale);

  let items: Awaited<ReturnType<typeof listPublishedNews>> = [];
  let error: string | null = null;

  if (dbConfigured) {
    try {
      items = await listPublishedNews(200);
    } catch {
      error = t('loadError');
    }
  } else {
    error = t('dbNotConnected');
  }

  const titresTraduits = locale !== 'fr' ? await translatedTitles(items, locale as NewsLocale) : null;

  return (
    <main style={{ paddingBottom: 96 }}>
      <div className="container-narrow" style={{ paddingTop: 64 }}>
        <Link href="/actualites" style={{ fontSize: '0.82rem', color: 'var(--sourdine)', textDecoration: 'underline' }}>
          {t('backToLive')}
        </Link>
        <div className="pill" style={{ margin: '16px 0' }}>{t('pill')}</div>
        <h1 style={{ fontSize: '2rem', marginBottom: 14 }}>{t('allArticlesTitle')}</h1>
        <p style={{ color: 'var(--ombre)', marginBottom: 8 }}>{t('allArticlesSubtitle')}</p>
      </div>

      <div className="container" style={{ paddingTop: 40 }}>
        {error && (
          <div className="card" style={{ padding: '14px 18px', marginBottom: 24, borderColor: 'var(--lever)', color: 'var(--lever-profond)', fontSize: '0.86rem' }}>
            {error}
          </div>
        )}

        {!error && items.length === 0 && <p style={{ color: 'var(--sourdine)' }}>{t('empty')}</p>}

        {!error && items.length > 0 && (
          <div className="tous-articles-grille">
            {items.map((item) => (
              <Link key={item.id} href={`/actualites?a=${item.slug}`} className="card tous-articles-carte">
                {item.image_url && (
                  <div className="photo-frame" style={{ aspectRatio: '16 / 10', marginBottom: 12 }}>
                    <img src={item.image_url} alt="" loading="lazy" />
                  </div>
                )}
                <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--sourdine)', marginBottom: 6 }}>
                  {item.publie_le && semaineLabel(item.publie_le, dateLocale, t)}
                </div>
                <h2 style={{ fontSize: '1.02rem', margin: '0 0 8px', lineHeight: 1.35 }}>
                  {titresTraduits?.get(item.id) ?? item.titre}
                </h2>
                <p style={{ fontSize: '0.86rem', color: 'var(--ombre)', margin: 0 }}>{item.resume}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .tous-articles-grille{
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 22px;
        }
        .tous-articles-carte{
          padding: 18px 20px;
          display: block;
          text-decoration: none;
          color: inherit;
        }
      `}</style>
    </main>
  );
}
