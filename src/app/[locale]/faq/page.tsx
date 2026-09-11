import { getTranslations } from 'next-intl/server';
import { CREDIT_EXPIRY_DAYS } from '@/lib/pricing';
import { Link } from '@/i18n/navigation';

export const metadata = {
  title: 'FAQ — Horosphère',
};

// Questions les plus fréquentes — retour direct : aucune réponse visible
// aux questions basiques (crédits perdus si résiliation, remboursement,
// suppression des données) avant l'achat. Accordéon natif (<details>),
// sans JS, cohérent avec le reste des pages "informations" du site
// (cgv, mentions-légales, politique de confidentialité), dont ce contenu
// reprend fidèlement les règles déjà en vigueur.
const NB_QUESTIONS = 8;

export default async function FaqPage() {
  const t = await getTranslations('Faq');

  return (
    <main className="container-narrow" style={{ paddingTop: 56, paddingBottom: 96 }}>
      <div className="pill" style={{ marginBottom: 16 }}>{t('pill')}</div>
      <h1 style={{ fontSize: '2rem', marginBottom: 10 }}>{t('title')}</h1>
      <p style={{ color: 'var(--ombre)', marginBottom: 32 }}>{t('intro')}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {Array.from({ length: NB_QUESTIONS }, (_, i) => i + 1).map((n) => (
          <details key={n} className="card" style={{ padding: '20px 24px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '1rem' }}>
              {t(`q${n}`)}
            </summary>
            <p style={{ margin: '14px 0 0', fontSize: '0.92rem', color: 'var(--ombre)' }}>
              {t.rich(`a${n}`, {
                days: CREDIT_EXPIRY_DAYS,
                link: (chunks) => (
                  <Link href="/politique-de-confidentialite" style={{ color: 'var(--lever-profond)' }}>
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </details>
        ))}
      </div>
    </main>
  );
}
