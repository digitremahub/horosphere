import { getTranslations } from 'next-intl/server';
import FreeTeaser from '@/components/FreeTeaser';
import DegreeArc from '@/components/DegreeArc';
import ZodiacWheelIllustration from '@/components/ZodiacWheelIllustration';
import ScrollReveal from '@/components/ScrollReveal';
import { Link } from '@/i18n/navigation';
import { auth } from '@/lib/auth';
import { dbConfigured } from '@/lib/db';
import { getBalance, hasActiveSubscription } from '@/lib/credits';
import { promoSeptembre2026Active } from '@/lib/promotions';

// Photo réelle du rituel quotidien — voir la bannière tarifs et la
// connexion pour les deux autres.
const PHOTO_RITUEL = '/images/hero-accueil.png';

async function etapes(promoActive: boolean) {
  const t = await getTranslations('Home');
  return [
    { titre: t('step1Title'), texte: promoActive ? t('step1TextPromo') : t('step1Text') },
    { titre: t('step2Title'), texte: t('step2Text') },
    { titre: t('step3Title'), texte: t('step3Text') },
  ];
}

/** CTA principal de la page d'accueil : "Commencer gratuitement" n'a de
 * sens que pour quelqu'un qui n'a pas encore de compte. Une personne déjà
 * connectée doit atterrir sur son espace pour lancer une lecture (s'il lui
 * reste du crédit) ou directement sur les forfaits pour en racheter —
 * jamais renvoyée vers l'inscription/connexion qu'elle a déjà faite. */
async function resolveMainCta(): Promise<{ href: string; label: string; teaserLabel: string }> {
  const session = await auth();
  const t = await getTranslations('Cta');
  if (!session?.user || !dbConfigured) {
    return { href: '/connexion', label: t('startFree'), teaserLabel: t('startFreeTeaser') };
  }
  const userId = Number((session.user as { id?: string }).id);
  let balance = 0;
  let abonne = false;
  try {
    balance = await getBalance(userId);
  } catch {
    balance = 0;
  }
  try {
    abonne = await hasActiveSubscription(userId);
  } catch {
    abonne = false;
  }
  if (balance > 0 || abonne) {
    return { href: '/app', label: t('launchReading'), teaserLabel: t('launchReading') };
  }
  return { href: '/tarifs', label: t('rechargeCredits'), teaserLabel: t('rechargeCredits') };
}

function SectionDivider() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }} aria-hidden="true">
      <DegreeArc startAngle={-38} endAngle={38} size={56} ticks={3} strokeWidth={1.4} strokeColor="var(--ambre)" />
    </div>
  );
}

export default async function HomePage() {
  const [cta, ETAPES, t] = await Promise.all([resolveMainCta(), etapes(promoSeptembre2026Active()), getTranslations('Home')]);
  return (
    <main>
      {/* 0. Bandeau d'ouverture, plein écran en largeur */}
      <div className="page-bandeau page-bandeau--hero">
        <img src="/images/accueil-bandeau-astrolabe.webp" alt={t('heroImageAlt')} loading="eager" />
      </div>

      {/* 1. Aperçu gratuit + présentation, côte à côte — la lune du jour a
         rejoint la page Actualités, pour ne plus être dupliquée à deux
         endroits. */}
      <section className="container hero-grid" style={{ paddingTop: 64, paddingBottom: 48, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
        <ScrollReveal style={{ display: 'flex', justifyContent: 'center' }}>
          <FreeTeaser ctaHref={cta.href} ctaLabel={cta.teaserLabel} />
        </ScrollReveal>
        <ScrollReveal delay={120}>
          <div className="pill hero-in-1" style={{ marginBottom: 18 }}>{t('heroPill')}</div>
          <h1 className="hero-in-2" style={{ fontSize: 'clamp(2rem, 3.2vw, 2.9rem)', marginBottom: 20 }}>
            {t.rich('heroTitle', { em: (chunks) => <em style={{ fontStyle: 'italic', color: 'var(--lever-profond)' }}>{chunks}</em> })}
          </h1>
          <p className="hero-in-3" style={{ color: 'var(--ombre)', fontSize: '1.02rem', marginBottom: 28 }}>
            {t('heroSubtitle')}
          </p>
          <div className="hero-in-4" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <Link href={cta.href} className="btn btn-primary">{cta.label}</Link>
            <Link href="/tarifs" className="btn btn-ghost">{t('seePackages')}</Link>
          </div>
        </ScrollReveal>
      </section>

      <SectionDivider />

      {/* 3. Les 3 étapes */}
      <section style={{ background: 'var(--brume)' }}>
        <div className="container" style={{ padding: '52px 24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 36 }} id="parcours">
          {ETAPES.map((e, i) => (
            <ScrollReveal key={e.titre} delay={i * 100} style={{ marginTop: i === 1 ? 14 : 0 }}>
              <div className="mono" style={{ color: 'var(--lever-profond)', fontSize: '0.8rem', marginBottom: 10 }}>0{i + 1}</div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: 8 }}>{e.titre}</h3>
              <p style={{ color: 'var(--ombre)', fontSize: '0.92rem' }}>{e.texte}</p>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <SectionDivider />

      {/* 4. Rituel */}
      <section className="container" style={{ padding: '56px 24px' }}>
        <div
          className="ritual-grid"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}
        >
          <ScrollReveal>
            <div className="photo-frame" style={{ aspectRatio: '4 / 3' }}>
              <img src={PHOTO_RITUEL} alt={t('ritualImageAlt')} loading="lazy" />
            </div>
          </ScrollReveal>
          <ScrollReveal delay={120}>
            <div className="pill" style={{ marginBottom: 16 }}>{t('ritualPill')}</div>
            <h2 style={{ fontSize: '1.6rem', marginBottom: 14 }}>{t('ritualTitle')}</h2>
            <p style={{ color: 'var(--ombre)', fontSize: '0.98rem', marginBottom: 14 }}>{t('ritualText1')}</p>
            <p style={{ color: 'var(--ombre)', fontSize: '0.98rem' }}>{t('ritualText2')}</p>
          </ScrollReveal>
        </div>
      </section>

      <SectionDivider />

      {/* 5. Forfaits */}
      <section className="container" style={{ padding: '56px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
          aria-hidden="true"
        >
          <ZodiacWheelIllustration size={480} opacity={0.12} />
        </div>
        <ScrollReveal style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: '1.7rem', marginBottom: 14 }}>{t('packagesTitle')}</h2>
          <p style={{ color: 'var(--ombre)', maxWidth: 520, margin: '0 auto 26px' }}>{t('packagesText')}</p>
          <Link href="/tarifs" className="btn btn-primary">{t('discoverPackages')}</Link>
        </ScrollReveal>
      </section>

      <style>{`
        .ritual-grid > *{ min-width: 0; }
        .hero-grid > *{ min-width: 0; }
        @media (max-width: 860px){
          .ritual-grid{ grid-template-columns: 1fr !important; }
          .hero-grid{ grid-template-columns: 1fr !important; gap: 36px !important; }
          .hero-grid h1, .hero-grid p, .hero-grid .pill{ text-align: center; }
          .hero-grid .hero-in-4{ justify-content: center; }
          #parcours{ grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px){
          .photo-frame{ aspect-ratio: 16 / 10 !important; }
        }
      `}</style>
    </main>
  );
}
