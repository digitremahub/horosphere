import Link from 'next/link';
import { listPublishedNews } from '@/lib/news';
import { dbConfigured } from '@/lib/db';

export const metadata = {
  title: 'Actualités — Horosphère',
};

export const revalidate = 300;

export default async function ActualitesPage() {
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
    <main className="container-narrow" style={{ paddingTop: 56, paddingBottom: 96 }}>
      <div className="pill" style={{ marginBottom: 16 }}>Actualités</div>
      <h1 style={{ fontSize: '2rem', marginBottom: 14 }}>Ce qui se passe chez Horosphère</h1>
      <p style={{ color: 'var(--ombre)', marginBottom: 40 }}>
        Nouveautés, coulisses et éclairages sur le ciel du moment — la même matière qui alimente notre
        newsletter hebdomadaire.
      </p>

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
    </main>
  );
}
