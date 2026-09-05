import { getTranslations } from 'next-intl/server';
import { CREDIT_EXPIRY_DAYS } from '@/lib/pricing';

export const metadata = {
  title: 'Conditions générales de vente — Horosphère',
};

export default async function CGVPage() {
  const t = await getTranslations('Cgv');
  return (
    <main className="container-narrow" style={{ paddingTop: 56, paddingBottom: 96 }}>
      <div className="pill" style={{ marginBottom: 16 }}>{t('pill')}</div>
      <h1 style={{ fontSize: '2rem', marginBottom: 10 }}>{t('title')}</h1>
      <p style={{ color: 'var(--ombre)', marginBottom: 18 }}>
        {t('intro')}
      </p>
      <div className="card" style={{ padding: '26px 24px', marginBottom: 24, marginTop: 36 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>{t('s1Title')}</h2>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>
          {t('s1Text')}
        </p>
      </div>

      <div className="card" style={{ padding: '26px 24px', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>{t('s2Title')}</h2>
        <p style={{ margin: '0 0 10px', fontSize: '0.92rem' }}>
          {t('s2Text1')}
        </p>
        <p style={{ margin: '0 0 10px', fontSize: '0.92rem' }}>
          {t.rich('s2Text2', { strong: (chunks) => <strong>{chunks}</strong>, days: CREDIT_EXPIRY_DAYS })}
        </p>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>
          {t('s2Text3')}
        </p>
      </div>

      <div className="card" style={{ padding: '26px 24px', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>{t('s3Title')}</h2>
        <p style={{ margin: '0 0 10px', fontSize: '0.92rem' }}>
          {t('s3Text1')}
        </p>
        <p style={{ margin: '0 0 10px', fontSize: '0.92rem' }}>
          {t('s3Text2')}
        </p>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>
          {t('s3Text3')}
        </p>
      </div>

      <div className="card" style={{ padding: '26px 24px', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>{t('s4Title')}</h2>
        <p style={{ margin: '0 0 10px', fontSize: '0.92rem' }}>
          {t('s4Text1')}
        </p>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>
          {t('s4Text2')}
        </p>
      </div>

      <div className="card" style={{ padding: '26px 24px', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>{t('s5Title')}</h2>
        <p style={{ margin: '0 0 10px', fontSize: '0.92rem' }}>
          {t('s5Text1')}
        </p>
        <p style={{ margin: '0 0 10px', fontSize: '0.92rem' }}>
          {t('s5Text2')}
        </p>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>
          {t('s5Text3')}
        </p>
      </div>

      <div className="card" style={{ padding: '26px 24px' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>{t('s6Title')}</h2>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>
          {t('s6Text')}
        </p>
      </div>
    </main>
  );
}
