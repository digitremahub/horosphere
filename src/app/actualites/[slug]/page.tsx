import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNewsBySlug } from '@/lib/news';
import { dbConfigured } from '@/lib/db';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!dbConfigured) return { title: 'Actualités — Horosphère' };
  const news = await getNewsBySlug(slug).catch(() => null);
  return { title: news ? `${news.titre} — Horosphère` : 'Actualités — Horosphère' };
}

export default async function ActualitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!dbConfigured) notFound();

  const news = await getNewsBySlug(slug).catch(() => null);
  if (!news) notFound();

  return (
    <main className="container-narrow" style={{ paddingTop: 56, paddingBottom: 96 }}>
      <Link href="/actualites" style={{ fontSize: '0.82rem', color: 'var(--ombre)', textDecoration: 'none' }}>
        ← Actualités
      </Link>

      {news.image_url && (
        <div className="photo-frame" style={{ height: 220, margin: '20px 0' }}>
          <img src={news.image_url} alt="" loading="lazy" />
        </div>
      )}

      <div className="mono" style={{ fontSize: '0.76rem', color: 'var(--sourdine)', margin: '20px 0 8px' }}>
        {news.publie_le && new Date(news.publie_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
      <h1 style={{ fontSize: '1.9rem', marginBottom: 24 }}>{news.titre}</h1>

      <div style={{ whiteSpace: 'pre-wrap', fontSize: '1rem', lineHeight: 1.7 }}>{news.contenu}</div>
    </main>
  );
}
