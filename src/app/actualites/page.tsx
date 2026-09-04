import Link from 'next/link';
import { listPublishedNews, splitArticleSections } from '@/lib/news';
import { dbConfigured } from '@/lib/db';
import AstrolabeIllustration from '@/components/AstrolabeIllustration';
import MoonOfTheDay from '@/components/MoonOfTheDay';
import SkyCountdown from '@/components/SkyCountdown';
import { getUpcomingSkyEvents } from '@/lib/skyEvents';

export const metadata = {
  title: 'Actualités — Horosphère',
};

export const revalidate = 300;

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

// Une seule page, sans navigation vers une page article séparée : à gauche
// la liste des actualités, à droite l'actualité lue, choisie via ?a=<slug>
// (par défaut la plus récente). `<Link>` change juste ce paramètre, donc ça
// reste un lien classique (accessible sans JS) mais sans jamais quitter
// cette page.
export default async function ActualitesPage({ searchParams }: { searchParams: Promise<{ a?: string }> }) {
  const { a } = await searchParams;
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

  const selected = (a && items.find((item) => item.slug === a)) || items[0] || null;
  const { corps, signesConcernes } = selected ? splitArticleSections(selected.contenu) : { corps: '', signesConcernes: [] };
  const dateLabel =
    selected?.publie_le && new Date(selected.publie_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <main style={{ paddingBottom: 96 }}>
      <div className="page-bandeau">
        <img
          src="/images/actualites-bandeau.png"
          alt="Un bureau d'astronome à l'ancienne (globe céleste, cartes, sextant) face à la Terre vue de l'espace, avec la lune et les planètes alignées dans le ciel."
          loading="eager"
        />
      </div>

      <div className="container-narrow" style={{ paddingTop: 56 }}>
        <div className="pill" style={{ marginBottom: 16 }}>Actualité du ciel</div>
        <h1 style={{ fontSize: '2rem', marginBottom: 14 }}>Ce qui se passe dans le ciel</h1>
        <p style={{ color: 'var(--ombre)', marginBottom: 8 }}>
          La position réelle des astres en direct, et une lecture de fond publiée chaque semaine — la
          même matière qui alimente notre newsletter.
        </p>
      </div>

      {/* En direct — astrolabe + lune du jour, déplacés depuis la page
          d'accueil : libres d'accès comme le reste de cette page, sans
          connexion ni abonnement. */}
      <section className="container" style={{ padding: '32px 24px 8px' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div className="pill">En direct</div>
        </div>

        <div className="actu-en-direct" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <AstrolabeIllustration size={260} />
            <p style={{ color: 'var(--ombre)', fontSize: '0.88rem', maxWidth: 400, margin: '16px auto 0' }}>
              La position réelle des sept planètes traditionnelles sur le zodiaque, telle qu'observée
              depuis la Terre à l'instant présent.
            </p>
          </div>
          <MoonOfTheDay />
        </div>

        <div style={{ marginTop: 40 }}>
          <p style={{ color: 'var(--sourdine)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, textAlign: 'center' }}>
            Prochains événements du ciel
          </p>
          <SkyCountdown events={skyEvents} />
        </div>
      </section>

      {/* Actualités : liste à gauche, actualité lue à droite, séparées par
          un simple trait — une seule page, jamais de page article à part. */}
      <div className="container" style={{ paddingTop: 48 }}>
        {error && (
          <div className="card" style={{ padding: '14px 18px', marginBottom: 24, borderColor: 'var(--lever)', color: 'var(--lever-profond)', fontSize: '0.86rem' }}>
            {error}
          </div>
        )}

        {!error && items.length === 0 && (
          <p style={{ color: 'var(--sourdine)' }}>Rien de publié pour l'instant — revenez bientôt.</p>
        )}

        {!error && items.length > 0 && selected && (
          <div className="actu-split">
            <div className="actu-liste">
              {items.map((item) => {
                const active = item.slug === selected.slug;
                return (
                  <Link
                    key={item.id}
                    href={`/actualites?a=${item.slug}`}
                    scroll={false}
                    className="card actu-liste-item"
                    style={{
                      padding: '16px 18px',
                      display: 'block',
                      textDecoration: 'none',
                      color: 'inherit',
                      marginBottom: 14,
                      borderColor: active ? 'var(--lever)' : undefined,
                      background: active ? 'var(--brume)' : undefined,
                    }}
                  >
                    {item.image_url && (
                      <div className="photo-frame" style={{ height: 90, marginBottom: 10 }}>
                        <img src={item.image_url} alt="" loading="lazy" />
                      </div>
                    )}
                    <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--sourdine)', marginBottom: 4 }}>
                      {item.publie_le && new Date(item.publie_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    <h2 style={{ fontSize: '0.98rem', margin: 0, lineHeight: 1.35 }}>{item.titre}</h2>
                  </Link>
                );
              })}
            </div>

            <div className="actu-separateur" aria-hidden="true" />

            <article className="actu-lue" style={{ minWidth: 0 }}>
              {selected.image_url && (
                <div className="photo-frame" style={{ height: 220, marginBottom: 20 }}>
                  <img src={selected.image_url} alt="" loading="lazy" />
                </div>
              )}
              <div className="mono" style={{ fontSize: '0.76rem', color: 'var(--sourdine)', marginBottom: 8 }}>{dateLabel}</div>
              <h2 style={{ fontSize: '1.6rem', marginBottom: 22 }}>{selected.titre}</h2>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '1rem', lineHeight: 1.7, marginBottom: signesConcernes.length > 0 ? 30 : 0 }}>
                {corps}
              </div>

              {signesConcernes.length > 0 && (
                <div className="card" style={{ padding: '22px 20px', boxShadow: 'none' }}>
                  <div className="pill" style={{ marginBottom: 14 }}>Cette semaine</div>
                  <h3 style={{ fontSize: '1.02rem', marginBottom: 16 }}>Signes les plus concernés</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {signesConcernes.map((s, i) => {
                      const aspect = aspectDe(s.texte);
                      return (
                        <div key={i} style={{ borderLeft: '2px solid var(--lever)', paddingLeft: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: '1.2rem', color: 'var(--lever-profond)' }}>{s.symbole}</span>
                            {aspect && (
                              <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--sourdine)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                {aspect}
                              </span>
                            )}
                          </div>
                          <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--ombre)' }}>{s.texte}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </article>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 720px){ .actu-en-direct{ grid-template-columns: 1fr !important; } }

        .actu-split{ display: grid; grid-template-columns: 280px 1px 1fr; gap: 36px; align-items: start; }
        .actu-liste{ display: flex; flex-direction: column; max-height: 760px; overflow-y: auto; padding-right: 4px; }
        .actu-separateur{ background: var(--trait); width: 1px; align-self: stretch; min-height: 100%; }

        @media (max-width: 900px){
          .actu-split{ grid-template-columns: 1fr !important; gap: 24px; }
          .actu-separateur{ width: 100%; height: 1px; }
          .actu-liste{ flex-direction: row; overflow-x: auto; overflow-y: visible; max-height: none; gap: 14px; padding-bottom: 4px; }
          .actu-liste-item{ min-width: 220px; margin-bottom: 0 !important; }
        }
      `}</style>
    </main>
  );
}
