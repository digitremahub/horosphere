import { getLocale, getTranslations } from 'next-intl/server';
import MoonPhase, { moonPhaseInfo } from './MoonPhase';
import type { MoonLocale } from '@/lib/moon-i18n';

export default async function MoonOfTheDay() {
  const locale = (await getLocale()) as MoonLocale;
  const t = await getTranslations('Moon');
  const info = moonPhaseInfo(new Date(), locale);

  return (
    <div
      className="card moon-of-day"
      style={{
        display: 'grid',
        gridTemplateColumns: '160px 1fr',
        gap: 32,
        alignItems: 'center',
        padding: '32px 36px',
        overflow: 'visible',
      }}
    >
      <div className="moon-of-day-icon" style={{ display: 'flex', justifyContent: 'center' }} aria-hidden="true">
        <MoonPhase size={140} locale={locale} />
      </div>
      <div>
        <div className="pill" style={{ marginBottom: 12, textTransform: 'capitalize' }}>{info.dateLabel}</div>
        <h3 style={{ fontSize: '1.4rem', marginBottom: 10 }}>{info.label}</h3>
        <p style={{ color: 'var(--ombre)', fontSize: '0.98rem', marginBottom: 10 }}>{info.influence}</p>
        <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--sourdine)' }}>
          {t('illuminatedTonight', { pct: info.illumination })}
        </div>
      </div>
      <style>{`
        @media (max-width: 560px){
          .moon-of-day{ grid-template-columns: 1fr !important; text-align: center; }
        }
      `}</style>
    </div>
  );
}
