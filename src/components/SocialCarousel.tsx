import { getTranslations } from 'next-intl/server';
import { listRecentSocialPosts } from '@/lib/socialPosts';
import { dbConfigured } from '@/lib/db';
import { SOCIAL_LINKS } from '@/lib/socialLinks';

const PLATFORM_HREF: Record<string, string | undefined> = {
  Instagram: SOCIAL_LINKS.instagram,
  Facebook: SOCIAL_LINKS.facebook,
};

/** Carrousel des dernières publications réellement publiées sur Instagram
 * et Facebook (voir lib/socialPosts.ts) — se renouvelle tout seul chaque
 * jour au fil des publications, sans jamais y retoucher à la main.
 * N'affiche rien si la base n'est pas configurée ou qu'aucun post n'a
 * encore été publié (jamais de section vide ou d'espace réservé bancal). */
export default async function SocialCarousel() {
  if (!dbConfigured) return null;
  const [posts, t] = await Promise.all([
    listRecentSocialPosts(12).catch(() => []),
    getTranslations('Home'),
  ]);
  if (posts.length === 0) return null;

  return (
    <section className="container" style={{ padding: '56px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div className="pill" style={{ marginBottom: 16, display: 'inline-block' }}>{t('socialPill')}</div>
        <h2 style={{ fontSize: '1.6rem' }}>{t('socialTitle')}</h2>
      </div>
      <div className="social-carousel">
        {posts.map((p) => {
          const href = PLATFORM_HREF[p.platform];
          const carte = (
            <>
              <div className="photo-frame" style={{ aspectRatio: '1 / 1', marginBottom: 10 }}>
                <img src={p.image_url!} alt="" loading="lazy" />
              </div>
              <p className="social-carousel-caption">{p.caption}</p>
            </>
          );
          return href ? (
            <a key={p.id} href={href} target="_blank" rel="noopener noreferrer" className="social-carousel-card">
              {carte}
            </a>
          ) : (
            <div key={p.id} className="social-carousel-card">{carte}</div>
          );
        })}
      </div>
      <style>{`
        .social-carousel{
          display: flex;
          gap: 18px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          padding-bottom: 8px;
        }
        .social-carousel-card{
          min-width: 220px;
          max-width: 220px;
          flex-shrink: 0;
          scroll-snap-align: start;
          color: inherit;
          text-decoration: none;
        }
        .social-carousel-caption{
          font-size: 0.82rem;
          color: var(--ombre);
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </section>
  );
}
