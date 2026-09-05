import { getTranslations } from 'next-intl/server';
import { CREDIT_EXPIRY_DAYS } from '@/lib/pricing';
import { Link } from '@/i18n/navigation';

export const metadata = {
  title: 'Politique de confidentialité — Horosphère',
};

export default async function PolitiqueConfidentialitePage() {
  const t = await getTranslations('PolitiqueConfidentialite');
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
          {t.rich('s1Text', {
            legal: (chunks) => <Link href="/mentions-legales" style={{ color: 'var(--lever-profond)' }}>{chunks}</Link>,
            email: (chunks) => <a href="mailto:contact@horosphere.fr" style={{ color: 'var(--lever-profond)' }}>{chunks}</a>,
          })}
        </p>
      </div>

      <div className="card" style={{ padding: '26px 24px', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>{t('s2Title')}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <strong style={{ fontSize: '0.92rem' }}>{t('s2AccountTitle')}</strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.92rem', color: 'var(--ombre)' }}>
              {t('s2AccountText')}
            </p>
          </div>
          <div>
            <strong style={{ fontSize: '0.92rem' }}>{t('s2ProfileTitle')}</strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.92rem', color: 'var(--ombre)' }}>
              {t('s2ProfileText')}
            </p>
          </div>
          <div>
            <strong style={{ fontSize: '0.92rem' }}>{t('s2HistoryTitle')}</strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.92rem', color: 'var(--ombre)' }}>
              {t('s2HistoryText')}
            </p>
          </div>
          <div>
            <strong style={{ fontSize: '0.92rem' }}>{t('s2PaymentTitle')}</strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.92rem', color: 'var(--ombre)' }}>
              {t('s2PaymentText')}
            </p>
          </div>
          <div>
            <strong style={{ fontSize: '0.92rem' }}>{t('s2NewsletterTitle')}</strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.92rem', color: 'var(--ombre)' }}>
              {t('s2NewsletterText')}
            </p>
          </div>
          <div>
            <strong style={{ fontSize: '0.92rem' }}>{t('s2CookieTitle')}</strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.92rem', color: 'var(--ombre)' }}>
              {t('s2CookieText')}
            </p>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '26px 24px', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>{t('s3Title')}</h2>
        <p style={{ margin: '0 0 10px', fontSize: '0.92rem' }}>
          {t('s3Text1')}
        </p>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>
          {t('s3Text2')}
        </p>
      </div>

      <div className="card" style={{ padding: '26px 24px', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>{t('s4Title')}</h2>
        <p style={{ margin: '0 0 10px', fontSize: '0.92rem' }}>
          {t('s4Text1')}
        </p>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.92rem', color: 'var(--ombre)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>{t.rich('s4Vercel', { strong: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('s4Neon', { strong: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('s4Stripe', { strong: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('s4Resend', { strong: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('s4Anthropic', { strong: (chunks) => <strong>{chunks}</strong> })}</li>
        </ul>
        <p style={{ margin: '10px 0 0', fontSize: '0.92rem' }}>
          {t('s4Text2')}
        </p>
      </div>

      <div className="card" style={{ padding: '26px 24px', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>{t('s5Title')}</h2>
        <p style={{ margin: '0 0 10px', fontSize: '0.92rem' }}>
          {t.rich('s5Text1', {
            days: CREDIT_EXPIRY_DAYS,
            cgv: (chunks) => <Link href="/cgv" style={{ color: 'var(--lever-profond)' }}>{chunks}</Link>,
          })}
        </p>
        <p style={{ margin: '0 0 10px', fontSize: '0.92rem' }}>
          {t('s5Text2')}
        </p>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>
          {t('s5Text3')}
        </p>
      </div>

      <div className="card" style={{ padding: '26px 24px', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>{t('s6Title')}</h2>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.92rem', color: 'var(--ombre)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>{t('s6Https')}</li>
          <li>{t('s6Bcrypt')}</li>
          <li>{t('s6Cookie')}</li>
          <li>{t('s6Bank')}</li>
          <li>{t('s6Access')}</li>
        </ul>
      </div>

      <div className="card" style={{ padding: '26px 24px' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>{t('s7Title')}</h2>
        <p style={{ margin: '0 0 10px', fontSize: '0.92rem' }}>
          {t.rich('s7Text1', {
            space: (chunks) => <Link href="/app/profil" style={{ color: 'var(--lever-profond)' }}>{chunks}</Link>,
            email: (chunks) => <a href="mailto:contact@horosphere.fr" style={{ color: 'var(--lever-profond)' }}>{chunks}</a>,
          })}
        </p>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>
          {t.rich('s7Text2', {
            link: (chunks) => <a href="https://www.cnil.fr/fr/agir" target="_blank" rel="noreferrer" style={{ color: 'var(--lever-profond)' }}>{chunks}</a>,
          })}
        </p>
      </div>
    </main>
  );
}
