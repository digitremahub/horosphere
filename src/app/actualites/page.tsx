import Link from 'next/link';
import { listPublishedNews } from '@/lib/news';
import { dbConfigured } from '@/lib/db';
import AstrolabeIllustration from '@/components/AstrolabeIllustration';
import SkyCountdown from '@/components/SkyCountdown';
import { getUpcomingSkyEvents } from '@/lib/skyEvents';

export const metadata = {
  title: 'Actualités — Horosphère',
};

export const revalidate = 300;

export default async function ActualitesPage() {
  const skyEvents = getUpcomingSkyEvents();
  let items: Awaited<ReturnType<typeof listPublishedNews>> = [];
  let error: string | null = null;

  if (dbConfigured) {
    try {
      items = await listPublishedNews(30);
    } catch {
      error = "Impossible de charger les actualités pour le moment.";
    }
  } else {
    error = "La base de données n'est pas encore connectée.";
  }

  return (
    <main style={{ paddingBottom: 96 }}>
      <div className="container-narrow" style={{ paddingTop: 56 }}>
        <div className="pill" style={{ marginBottom: 16 }}>Actualité du ciel</div>
        <h1 style={{ fontSize: '2rem', marginBottom: 14 }}>Ce qui se passe dans le ciel</h1>
        <p style={{ color: 'var(--ombre)', marginBottom: 8 }}>
          La position réelle des astres en direct, et une lecture de fond publiée chaque semaine — la
          même matière qui alimente notre newsletter.
        </p>
      </div>

      {/* En direct — déplacé depuis la page d'accueil : la position réelle des
          planètes et le compte à rebours des prochains événements du ciel
          n'ont plus besoin d'être dupliqués dans les articles ci-dessous. */}
      <section className="container" style={{ padding: '32px 24px 8px', textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="pill" style={{ marginBottom: 16 }}>En direct</div>
          <AstrolabeIllustration size={280} />
          <p style={{ color: 'var(--ombre)', fontSize: '0.88rem', maxWidth: 440, margin: '16px auto 0' }}>
            La position réelle des sept planètes traditionnelles sur le zodiaque, telle qu'observée depuis
            la Terre à l'instant présent.
          </p>
        </div>

        <div style={{ marginTop: 36 }}>
          <p style={{ color: 'var(--sourdine)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            Prochains événements du ciel
          </p>
          <SkyCountdown events={skyEvents} />
        </div>
      </section>

      <div className="container-narrow" style={{ paddingTop: 48 }}>
        {error && (
          <div className="card" style={{ padding: '14px 18px', marginBottom: 24, borderColor: 'var(--lever)', color: 'var(--lever-profond)', fontSize: '0.86rem' }}>
            {error}
          </div>
        )}

        {!error && items.length === 0 && (
          <p style={{ color: 'var(--sourdine)' }}>Rien de publié pour l'instant — revenez bientôt.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {items.map((item) => (
            <Link key={item.id} href={`/actualites/${item.slug}`} className="card" style={{ padding: '20px 22px', display: 'block', textDecoration: 'none', color: 'inherit' }}>
              {item.image_url && (
                <div className="photo-frame" style={{ height: 140, marginBottom: 14 }}>
                  <img src={item.image_url} alt="" loading="lazy" />
                </div>
              )}
              <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--sourdine)', marginBottom: 6 }}>
                {item.publie_le && new Date(item.publie_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <h2 style={{ fontSize: '1.2rem', marginBottom: 6 }}>{item.titre}</h2>
              {item.resume && <p style={{ margin: 0, color: 'var(--ombre)', fontSize: '0.9rem' }}>{item.resume}</p>}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
