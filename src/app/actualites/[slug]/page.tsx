import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNewsBySlug, splitArticleSections } from '@/lib/news';
import { dbConfigured } from '@/lib/db';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!dbConfigured) return { title: 'Actualités — Horosphère' };
  const news = await getNewsBySlug(slug).catch(() => null);
  return { title: news ? `${news.titre} — Horosphère` : 'Actualités — Horosphère' };
}

const ASPECT_HINT: Record<string, string> = {
  'en prise directe': 'conjonction',
  'en opposition': 'opposition',
  'en carré': 'carré',
};

function aspectDe(texte: string): string | null {
  for (const cle of Object.keys(ASPECT_HINT)) {
    if (texte.includes(cle)) return ASPECT_HINT[cle];
  }
  return null;
}

export default async function ActualitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!dbConfigured) notFound();

  const news = await getNewsBySlug(slug).catch(() => null);
  if (!news) notFound();

  const { corps, signesConcernes } = splitArticleSections(news.contenu);
  const dateLabel = news.publie_le && new Date(news.publie_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <main style={{ paddingBottom: 96 }}>
      <div className="container-narrow" style={{ paddingTop: 56 }}>
        <Link href="/actualites" style={{ fontSize: '0.82rem', color: 'var(--ombre)', textDecoration: 'none' }}>
          ← Actualités
        </Link>
      </div>

      <div className="container actu-article" style={{ paddingTop: 20, display: 'grid', gridTemplateColumns: signesConcernes.length > 0 ? '1.4fr 1fr' : '1fr', gap: 40, alignItems: 'start' }}>
        <article style={{ minWidth: 0 }}>
          {news.image_url && (
            <div className="photo-frame" style={{ height: 220, marginBottom: 20 }}>
              <img src={news.image_url} alt="" loading="lazy" />
            </div>
          )}

          <div className="mono" style={{ fontSize: '0.76rem', color: 'var(--sourdine)', marginBottom: 8 }}>{dateLabel}</div>
          <h1 style={{ fontSize: '1.9rem', marginBottom: 24 }}>{news.titre}</h1>

          <div style={{ whiteSpace: 'pre-wrap', fontSize: '1rem', lineHeight: 1.7 }}>{corps}</div>
        </article>

        {signesConcernes.length > 0 && (
          <aside className="card" style={{ padding: '24px 22px', position: 'sticky', top: 24, boxShadow: 'none' }}>
            <div className="pill" style={{ marginBottom: 16 }}>Cette semaine</div>
            <h2 style={{ fontSize: '1.1rem', marginBottom: 18 }}>Signes les plus concernés</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {signesConcernes.map((s, i) => {
                const aspect = aspectDe(s.texte);
                return (
                  <div key={i} style={{ borderLeft: '2px solid var(--lever)', paddingLeft: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: '1.3rem', color: 'var(--lever-profond)' }}>{s.symbole}</span>
                      {aspect && (
                        <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--sourdine)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {aspect}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--ombre)' }}>{s.texte}</p>
                  </div>
                );
              })}
            </div>
          </aside>
        )}
      </div>

      <style>{`
        @media (max-width: 860px){ .actu-article{ grid-template-columns: 1fr !important; } }
      `}</style>
    </main>
  );
}
