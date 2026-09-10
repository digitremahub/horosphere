import { getLocale, getTranslations } from 'next-intl/server';
import { listPublishedNews } from '@/lib/news';
import { dbConfigured } from '@/lib/db';
import { Link } from '@/i18n/navigation';
import { dateLocaleTag } from '@/i18n/dateLocale';

// Aperçu des derniers articles "actualité du ciel" sur la page d'accueil —
// jusqu'à 4, chacun renvoyant directement vers l'article ouvert sur
// /actualites (?a=slug), qui reste la page complète pour qui aime la
// lecture. N'affiche rien si la base n'est pas configurée ou qu'aucun
// article n'a encore été publié (même logique que SocialCarousel).
export default async function NewsTeaser() {
  if (!dbConfigured) return null;
  const [items, t, locale] = await Promise.all([
    listPublishedNews(4).catch(() => []),
    getTranslations('Home'),
    getLocale(),
  ]);
  if (items.length === 0) return null;

  return (
    <section className="container" style={{ padding: '56px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div className="pill" style={{ marginBottom: 16, display: 'inline-block' }}>{t('newsPill')}</div>
        <h2 style={{ fontSize: '1.6rem', marginBottom: 10 }}>{t('newsTitle')}</h2>
        <Link href="/actualites/tous" style={{ fontSize: '0.86rem', color: 'var(--lever-profond)', textDecoration: 'underline' }}>
          {t('newsSeeAll')}
        </Link>
      </div>
      <div className="news-teaser-row">
        {items.map((item) => (
          <Link key={item.id} href={`/actualites?a=${item.slug}`} className="news-teaser-card card">
            {item.image_url && (
              <div className="photo-frame" style={{ aspectRatio: '16 / 10', marginBottom: 10 }}>
                <img src={item.image_url} alt="" loading="lazy" />
              </div>
            )}
            <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--sourdine)', marginBottom: 6 }}>
              {item.publie_le && new Date(item.publie_le).toLocaleDateString(dateLocaleTag(locale), { day: 'numeric', month: 'long' })}
            </div>
            <h3 style={{ fontSize: '0.98rem', margin: '0 0 6px' }}>{item.titre}</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--ombre)', margin: 0 }}>{item.resume}</p>
          </Link>
        ))}
      </div>
      <style>{`
        .news-teaser-row{
          display: flex;
          gap: 18px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          padding-bottom: 8px;
        }
        .news-teaser-card{
          min-width: 240px;
          max-width: 240px;
          flex-shrink: 0;
          scroll-snap-align: start;
          text-decoration: none;
          color: inherit;
          padding: 14px 16px;
          display: block;
        }
      `}</style>
    </section>
  );
}
