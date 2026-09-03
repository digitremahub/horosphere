import { auth } from '@/lib/auth';
import { stripeConfigured } from '@/lib/stripe';
import { CREDIT_PACKS, SUBSCRIPTIONS, FEATURE_COSTS, FEATURE_LABELS, euros } from '@/lib/pricing';
import PricingButton from '@/components/PricingButton';
import BrandMark from '@/components/BrandMark';
import ScrollReveal from '@/components/ScrollReveal';

const PHOTO_BANNIERE = '/images/bg-tarifs.png';

export default async function TarifsPage() {
  const session = await auth();
  const loggedIn = Boolean(session?.user);

  return (
    <main className="container" style={{ paddingTop: 56, paddingBottom: 96 }}>
      <ScrollReveal>
        <div className="photo-frame" style={{ height: 220, marginBottom: 40 }}>
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
      </ScrollReveal>

      <div style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto 48px' }}>
        <div className="pill" style={{ marginBottom: 16 }}>Tarifs</div>
        <h1 style={{ fontSize: '2.1rem', marginBottom: 14 }}>Payez ce que vous lisez, gardez ce que vous achetez</h1>
        <p style={{ color: 'var(--ombre)' }}>
          Commencez par un pack quand l'envie s'en fait sentir. Passez à l'abonnement seulement si Horosphère
          devient une habitude — jamais l'inverse.
        </p>
      </div>

      <h2 style={{ fontSize: '1.3rem', marginBottom: 18 }}>Packs de crédits</h2>
      <p style={{ color: 'var(--sourdine)', fontSize: '0.86rem', marginBottom: 22 }}>Valables 45 jours après l'achat.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18, marginBottom: 60 }}>
        {CREDIT_PACKS.map((p, i) => (
          <ScrollReveal key={p.slug} delay={i * 60}>
            <div className="card" style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 14, overflow: 'visible', marginTop: i % 2 === 1 ? 10 : 0 }}>
              <div style={{ position: 'absolute', top: -13, right: -13, pointerEvents: 'none' }} aria-hidden="true">
                <BrandMark size={56} />
              </div>
              <div style={{ fontSize: '1.6rem' }}>{p.emoji}</div>
              <div>
                <div style={{ fontWeight: 700 }}>{p.nom}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--ombre)' }}>{p.accroche}</div>
              </div>
              <div>
                <span className="mono" style={{ fontSize: '1.5rem', fontWeight: 500 }}>{euros(p.prixCentimes)}</span>
                <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--sourdine)' }}>{p.credits} crédits</div>
              </div>
              <PricingButton kind="pack" slug={p.slug} loggedIn={loggedIn} configured={stripeConfigured && Boolean(process.env[p.envKey])} />
            </div>
          </ScrollReveal>
        ))}
      </div>

      <h2 style={{ fontSize: '1.3rem', marginBottom: 18 }}>Abonnements</h2>
      <p style={{ color: 'var(--sourdine)', fontSize: '0.86rem', marginBottom: 22 }}>Résiliable à tout moment, crédits rechargés chaque mois.</p>
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
                  Le plus choisi
                </div>
              )}
              <div style={{ fontSize: '1.6rem' }}>{s.emoji}</div>
              <div>
                <div style={{ fontWeight: 700 }}>{s.nom}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--ombre)' }}>{s.avantage}</div>
              </div>
              <div>
                <span className="mono" style={{ fontSize: '1.5rem', fontWeight: 500 }}>{euros(s.prixCentimesParMois)}</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--sourdine)' }}> /mois</span>
                <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--sourdine)' }}>{s.creditsParMois} crédits / mois</div>
              </div>
              <PricingButton kind="sub" slug={s.slug} loggedIn={loggedIn} configured={stripeConfigured && Boolean(process.env[s.envKey])} label="S'abonner" />
            </div>
          </ScrollReveal>
        ))}
      </div>

      <h2 style={{ fontSize: '1.3rem', marginBottom: 18 }}>Combien coûte chaque lecture ?</h2>
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
              <div style={{ fontWeight: 600, fontSize: '0.94rem' }}>{FEATURE_LABELS[key].nom}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--sourdine)' }}>
                {FEATURE_LABELS[key].description}
                {!FEATURE_LABELS[key].disponible && ' — bientôt disponible'}
              </div>
            </div>
            <div className="mono" style={{ fontWeight: 600, color: 'var(--lever-profond)', whiteSpace: 'nowrap' }}>
              {FEATURE_COSTS[key]} cr.
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 480px){ .photo-frame{ height: 160px !important; } }
      `}</style>
    </main>
  );
}
