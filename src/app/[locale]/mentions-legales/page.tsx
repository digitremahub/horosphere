import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export const metadata = {
  title: 'Mentions légales — Horosphère',
};

// Certaines informations d'identité de l'éditeur ne peuvent pas être
// devinées ni inventées : elles sont marquées [À COMPLÉTER] en attendant
// que l'éditeur du site les renseigne. Ne jamais remplacer ces champs par
// des valeurs plausibles mais non vérifiées.
function ACompleter({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ background: 'var(--brume)', border: '1px dashed var(--ambre)', borderRadius: 6, padding: '1px 8px', color: 'var(--ambre)', fontWeight: 600 }}>
      {children}
    </span>
  );
}

export default async function MentionsLegalesPage() {
  const t = await getTranslations('MentionsLegales');
  return (
    <main className="container-narrow" style={{ paddingTop: 56, paddingBottom: 96 }}>
      <div className="pill" style={{ marginBottom: 16 }}>{t('pill')}</div>
      <h1 style={{ fontSize: '2rem', marginBottom: 10 }}>{t('title')}</h1>
      <p style={{ color: 'var(--ombre)', marginBottom: 36 }}>
        {t('intro')}
      </p>

      <div className="card" style={{ padding: '26px 24px', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>{t('s1Title')}</h2>
        <p style={{ margin: '0 0 8px', fontSize: '0.92rem' }}>
          {t('s1Name', { value: t('toComplete', { field: t('s1NameField') }) })}
        </p>
        <p style={{ margin: '0 0 8px', fontSize: '0.92rem' }}>
          {t('s1Form', { value: t('toComplete', { field: t('s1FormField') }) })}
        </p>
        <p style={{ margin: '0 0 8px', fontSize: '0.92rem' }}>
          {t('s1Address', { value: t('toComplete', { field: t('s1AddressField') }) })}
        </p>
        <p style={{ margin: '0 0 8px', fontSize: '0.92rem' }}>
          {t('s1Siret', { value: t('toComplete', { field: t('s1SiretField') }) })}
        </p>
        <p style={{ margin: '0 0 8px', fontSize: '0.92rem' }}>
          {t('s1Director')}
        </p>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>
          {t.rich('s1Contact', { email: (chunks) => <a href="mailto:contact@horosphere.fr" style={{ color: 'var(--lever-profond)' }}>{chunks}</a> })}
        </p>
      </div>

      <div className="card" style={{ padding: '26px 24px', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>{t('s2Title')}</h2>
        <p style={{ margin: '0 0 8px', fontSize: '0.92rem' }}>
          {t('s2Text1')}
        </p>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>
          {t.rich('s2Text2', { link: (chunks) => <a href="https://vercel.com" style={{ color: 'var(--lever-profond)' }}>{chunks}</a> })}
        </p>
      </div>

      <div className="card" style={{ padding: '26px 24px', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>{t('s3Title')}</h2>
        <p style={{ margin: '0 0 12px', fontSize: '0.92rem' }}>
          {t('s3Text1')}
        </p>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>
          {t('s3Text2')}
        </p>
      </div>

      <div className="card" style={{ padding: '26px 24px' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>{t('s4Title')}</h2>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>
          {t.rich('s4Text', {
            link: (chunks) => <Link href="/politique-de-confidentialite" style={{ color: 'var(--lever-profond)' }}>{chunks}</Link>,
          })}
        </p>
      </div>
    </main>
  );
}
