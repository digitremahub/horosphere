import { getTranslations } from 'next-intl/server';
import { dbConfigured } from '@/lib/db';
import { getSiteConfig, CLES_VIDEO } from '@/lib/siteConfig';
import { Link } from '@/i18n/navigation';
import VideoAvecSon from './VideoAvecSon';

// Récap hebdomadaire (Elian & Lya, produit chaque dimanche — même asset
// que celui publié sur Instagram, voir lib/reels.ts) — visible par TOUS,
// connectés ou non. Volontairement centré sur les grandes tendances de la
// semaine, jamais le détail personnalisé par signe : un aperçu qui donne
// envie, pas un remplacement de la valeur réservée aux abonnés.
// La dernière vidéo publiée remplace la précédente (voir
// /api/admin/site-config, clé weekly_video_url) — mise à jour manuelle
// chaque dimanche pour cette V1. Ne s'affiche que si une URL est
// configurée.
export default async function WeeklyRecapSection() {
  if (!dbConfigured) return null;
  const url = await getSiteConfig(CLES_VIDEO.hebdo);
  if (!url) return null;
  const t = await getTranslations('Home');

  return (
    <section className="container" style={{ padding: '56px 24px', textAlign: 'center' }}>
      <div className="pill" style={{ marginBottom: 16 }}>{t('weeklyVideoPill')}</div>
      <h2 style={{ fontSize: '1.6rem', marginBottom: 20 }}>{t('weeklyVideoTitle')}</h2>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <VideoAvecSon src={url} />
        <div style={{ marginTop: 22 }}>
          <Link href="/connexion" className="btn btn-primary">{t('weeklyVideoCta')}</Link>
        </div>
      </div>
    </section>
  );
}
