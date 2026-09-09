import { getLocale, getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { dbConfigured } from '@/lib/db';
import { stripeConfigured } from '@/lib/stripe';
import { CREDIT_PACKS, SUBSCRIPTIONS, FEATURE_COSTS, FEATURE_LABELS, WELCOME_CREDITS, euros } from '@/lib/pricing';
import { getActivePromotion, bonusAbonnementRestant } from '@/lib/promotions';
import { dateLocaleTag } from '@/i18n/dateLocale';
import PricingButton from '@/components/PricingButton';
import BrandMark from '@/components/BrandMark';
import ScrollReveal from '@/components/ScrollReveal';

const PHOTO_BANNIERE = '/images/bg-tarifs.png';

export default async function TarifsPage() {
  const session = await auth();
  const loggedIn = Boolean(session?.user);
  const locale = await getLocale();
  const promo = dbConfigured ? await getActivePromotion().catch(() => null) : null;
  const placesRestantes = promo ? (await bonusAbonnementRestant(promo).catch(() => promo.bonusAbonnementQuota)) ?? 0 : 0;
  const finLabel = promo ? promo.fin.toLocaleDateString(dateLocaleTag(locale), { day: 'numeric', month: 'long' }) : '';
  const t = await getTranslations('Pricing');

  return (
    <main style={{ paddingBottom: 96 }}>
      <div className="page-bandeau">
        <img
          src={PHOTO_BANNIERE}
          alt="Gros plan sur les graduations dorées d'un astrolabe."
          loading="lazy"
        />
        <div style={{ position: 'absolute', left: 0, bottom: 0, zIndex: 2, padding: '20px 28px', color: 'var(--aube)' }}>
          <div className="mono" style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.9 }}>
            Horosphère
          </div>
          <div className="display" style={{ fontSize: '1.3rem', fontStyle: 'italic' }}>Choisissez votre rythme</div>
        </div>
      </div>

      <div className="container">
      <div style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto 48px' }}>
        <div className="pill" style={{ marginBottom: 16 }}>{t('pill')}</div>
        <h1 style={{ fontSize: '2.1rem', marginBottom: 14 }}>{t('title')}</h1>
        <p style={{ color: 'var(--ombre)' }}>
          {t('intro')}
        </p>
      </div>

      {promo && (
        <div className="card" style={{ padding: '20px 22px', marginBottom: 48, borderColor: 'var(--lever)', background: 'var(--brume)' }}>
          <div className="pill" style={{ marginBottom: 12, borderColor: 'var(--lever)', color: 'var(--lever-profond)' }}>{promo.nom || t('launchOfferPill')}</div>
          <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.92rem', color: 'var(--encre)' }}>
            {promo.reductionPourcent != null && (
              <li>{t('promo10', { pourcent: promo.reductionPourcent, date: finLabel })}</li>
            )}
            {promo.bonusAbonnementMultiplicateur != null && (
              <li>
                {promo.bonusAbonnementQuota == null
                  ? t('promoDoubleUnlimited', { multiplicateur: promo.bonusAbonnementMultiplicateur })
                  : placesRestantes > 0
                  ? t('promoDoubleWithSlots', { multiplicateur: promo.bonusAbonnementMultiplicateur, n: placesRestantes })
                  : t('promoDoubleSoldOut')}
              </li>
            )}
            {promo.creditsBienvenue != null && promo.creditsBienvenueJours != null && (
              <li>{t('promoWelcomeCredits', { credits: promo.creditsBienvenue, defaut: WELCOME_CREDITS, jours: promo.creditsBienvenueJours })}</li>
            )}
          </ul>
        </div>
      )}

      <h2 style={{ fontSize: '1.3rem', marginBottom: 18 }}>{t('packsTitle')}</h2>
      <p style={{ color: 'var(--sourdine)', fontSize: '0.86rem', marginBottom: 22 }}>
        {t('packsSubtitleBase')}
        {promo?.reductionPourcent != null && t('packsSubtitlePromo', { pourcent: promo.reductionPourcent, date: finLabel })}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18, marginBottom: 60 }}>
        {CREDIT_PACKS.map((p, i) => (
          <ScrollReveal key={p.slug} delay={i * 60}>
            <div className="card" style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 14, overflow: 'visible', marginTop: i % 2 === 1 ? 10 : 0 }}>
              <div style={{ position: 'absolute', top: -13, right: -13, pointerEvents: 'none' }} aria-hidden="true">
                <BrandMark size={56} />
              </div>
              <div style={{ fontSize: '1.6rem' }}>{p.emoji}</div>
              <div>
                <div style={{ fontWeight: 700 }}>{t(`packs.${p.slug}.nom`)}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--ombre)' }}>{t(`packs.${p.slug}.accroche`)}</div>
              </div>
              <div>
                <span className="mono" style={{ fontSize: '1.5rem', fontWeight: 500 }}>{euros(p.prixCentimes)}</span>
                <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--sourdine)' }}>{p.credits} {t('creditsUnit')}</div>
              </div>
              <PricingButton kind="pack" slug={p.slug} loggedIn={loggedIn} configured={stripeConfigured && Boolean(process.env[p.envKey])} />
            </div>
          </ScrollReveal>
        ))}
      </div>

      <h2 style={{ fontSize: '1.3rem', marginBottom: 18 }}>{t('subscriptionsTitle')}</h2>
      <p style={{ color: 'var(--sourdine)', fontSize: '0.86rem', marginBottom: 22 }}>
        {t('subscriptionsSubtitleBase')}
        {promo?.bonusAbonnementMultiplicateur != null &&
          (promo.bonusAbonnementQuota == null || placesRestantes > 0) &&
          t('subscriptionsSubtitlePromo', { multiplicateur: promo.bonusAbonnementMultiplicateur, n: placesRestantes })}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 64 }}>
        {SUBSCRIPTIONS.map((s, i) => (
          <ScrollReveal key={s.slug} delay={i * 60}>
            <div
              className="card"
              style={{
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                borderColor: s.misEnAvant ? 'var(--lever)' : 'var(--trait)',
                overflow: 'visible',
              }}
            >
              <div style={{ position: 'absolute', top: -13, right: -13, pointerEvents: 'none' }} aria-hidden="true">
                <BrandMark size={56} />
              </div>
              {s.misEnAvant && (
                <div className="pill" style={{ position: 'absolute', top: -13, left: 24, background: 'var(--lever)', color: 'var(--aube)', borderColor: 'var(--lever)' }}>
                  {t('mostChosen')}
                </div>
              )}
              <div style={{ fontSize: '1.6rem' }}>{s.emoji}</div>
              <div>
                <div style={{ fontWeight: 700 }}>{t(`subscriptions.${s.slug}.nom`)}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--ombre)' }}>{t(`subscriptions.${s.slug}.avantage`)}</div>
              </div>
              <div>
                <span className="mono" style={{ fontSize: '1.5rem', fontWeight: 500 }}>{euros(s.prixCentimesParMois)}</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--sourdine)' }}> {t('perMonth')}</span>
                <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--sourdine)' }}>{s.creditsParMois} {t('creditsPerMonth')}</div>
              </div>
              <PricingButton kind="sub" slug={s.slug} loggedIn={loggedIn} configured={stripeConfigured && Boolean(process.env[s.envKey])} label={t('subscribe')} />
            </div>
          </ScrollReveal>
        ))}
      </div>

      <h2 style={{ fontSize: '1.3rem', marginBottom: 18 }}>{t('costTitle')}</h2>
      <div className="card" style={{ overflow: 'hidden' }}>
        {(Object.keys(FEATURE_COSTS) as (keyof typeof FEATURE_COSTS)[]).map((key, i, arr) => (
          <div
            key={key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 22px',
              borderBottom: i < arr.length - 1 ? '1px solid var(--trait)' : 'none',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: '0.94rem' }}>{t(`features.${key}.nom`)}</span>
                {FEATURE_LABELS[key].subscriptionOnly && (
                  <span className="pill" style={{ padding: '2px 8px', fontSize: '0.62rem', borderColor: 'var(--ambre)', color: 'var(--ambre)' }}>
                    {t('subscriptionRequiredBadge')}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--sourdine)' }}>
                {FEATURE_LABELS[key].disponible
                  ? t(`features.${key}.description`)
                  : t('descriptionComingSoon', { description: t(`features.${key}.description`) })}
              </div>
            </div>
            <div className="mono" style={{ fontWeight: 600, color: 'var(--lever-profond)', whiteSpace: 'nowrap' }}>
              {FEATURE_COSTS[key]} {t('creditUnit')}
            </div>
          </div>
        ))}
      </div>
      </div>
    </main>
  );
}
