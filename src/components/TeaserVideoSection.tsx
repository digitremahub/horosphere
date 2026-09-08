import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { dbConfigured } from '@/lib/db';
import { getSiteConfig, CLES_VIDEO } from '@/lib/siteConfig';
import { Link } from '@/i18n/navigation';
import VideoAvecSon from './VideoAvecSon';

// Vidéo teaser (Elian & Lya présentent le positionnement) — hero de la
// homepage, réservée aux visiteurs NON connectés (quelqu'un déjà inscrit
// n'a plus besoin d'être convaincu de créer un compte). Asset fixe,
// remplaçable à la main via /api/admin/site-config sans redéploiement.
// Ne s'affiche que si une URL est configurée — jamais de section vide.
export default async function TeaserVideoSection() {
  const [session, t] = await Promise.all([auth(), getTranslations('Home')]);
  if (session?.user || !dbConfigured) return null;

  const url = await getSiteConfig(CLES_VIDEO.teaser);
  if (!url) return null;

  return (
    <section className="container" style={{ padding: '48px 24px 8px', textAlign: 'center' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <VideoAvecSon src={url} />
        <div style={{ marginTop: 22 }}>
          <Link href="/connexion" className="btn btn-primary">{t('teaserVideoCta')}</Link>
        </div>
      </div>
    </section>
  );
}
