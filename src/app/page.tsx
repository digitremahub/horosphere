import FreeTeaser from '@/components/FreeTeaser';
import DegreeArc from '@/components/DegreeArc';
import AstrolabeIllustration from '@/components/AstrolabeIllustration';
import ZodiacWheelIllustration from '@/components/ZodiacWheelIllustration';
import ScrollReveal from '@/components/ScrollReveal';
import MoonOfTheDay from '@/components/MoonOfTheDay';

// Photo réelle du rituel quotidien — voir la bannière tarifs et la
// connexion pour les deux autres.
const PHOTO_RITUEL = '/images/hero-accueil.png';

const ETAPES = [
  { titre: 'Vous arrivez, sans engagement', texte: "Créez votre compte en un e-mail, aucune carte requise. Vous recevez vos premiers crédits offerts." },
  { titre: 'Vous lisez, à votre rythme', texte: 'Chaque lecture consomme quelques crédits. Vous ne payez que ce que vous utilisez.' },
  { titre: 'Vous restez, si ça vous fait du bien', texte: 'Un pack quand vous en avez besoin, un abonnement si Horosphère devient une habitude. Toujours résiliable.' },
];

function SectionDivider() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }} aria-hidden="true">
      <DegreeArc startAngle={-38} endAngle={38} size={56} ticks={3} strokeWidth={1.4} strokeColor="var(--ambre)" />
    </div>
  );
}

export default function HomePage() {
  return (
    <main>
      {/* 1. La lune du jour, à moitié de l'aperçu gratuit */}
      <section className="container" style={{ paddingTop: 64, paddingBottom: 48 }}>
        <div
          className="top-grid"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'stretch' }}
        >
          <ScrollReveal>
            <MoonOfTheDay />
          </ScrollReveal>
          <ScrollReveal delay={120}>
            <FreeTeaser />
          </ScrollReveal>
        </div>
      </section>

      <SectionDivider />

      {/* 2. Présentation, en bandeau */}
      <section className="container" style={{ padding: '8px 24px 48px', textAlign: 'center' }}>
        <div className="pill hero-in-1" style={{ marginBottom: 18 }}>Horoscope IA quotidien</div>
        <h1 className="hero-in-2" style={{ fontSize: 'clamp(2.2rem, 4vw, 3.1rem)', marginBottom: 20, maxWidth: 720, margin: '0 auto 20px' }}>
          Un instant de clarté, <em style={{ fontStyle: 'italic', color: 'var(--lever-profond)' }}>chaque jour</em>, sans pression.
        </h1>
        <p className="hero-in-3" style={{ color: 'var(--ombre)', fontSize: '1.05rem', maxWidth: 520, margin: '0 auto 28px' }}>
          Horosphère écrit votre lecture du jour à partir de votre signe — et bientôt de votre thème complet.
          Pensé pour devenir une habitude douce.
        </p>
        <div className="hero-in-4" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="/connexion" className="btn btn-primary">Commencer gratuitement</a>
          <a href="/tarifs" className="btn btn-ghost">Voir les forfaits</a>
        </div>
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

      {/* 4. Illustration */}
      <section className="container" style={{ padding: '48px 24px', display: 'flex', justifyContent: 'center' }}>
        <ScrollReveal>
          <AstrolabeIllustration size={300} />
        </ScrollReveal>
      </section>

      <SectionDivider />

      {/* 5. Rituel */}
      <section className="container" style={{ padding: '56px 24px' }}>
        <div
          className="ritual-grid"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}
        >
          <ScrollReveal>
            <div className="photo-frame" style={{ aspectRatio: '4 / 3' }}>
              <img
                src={PHOTO_RITUEL}
                alt="Un moment d'écriture au calme, à la lumière d'une bougie — le rituel quotidien d'Horosphère."
                loading="lazy"
              />
            </div>
          </ScrollReveal>
          <ScrollReveal delay={120}>
            <div className="pill" style={{ marginBottom: 16 }}>Un rituel</div>
            <h2 style={{ fontSize: '1.6rem', marginBottom: 14 }}>
              Deux minutes, chaque matin, rien que pour vous
            </h2>
            <p style={{ color: 'var(--ombre)', fontSize: '0.98rem', marginBottom: 14 }}>
              Pas de scroll infini, pas de notifications culpabilisantes. Horosphère tient en une lecture
              courte, pensée pour s'intégrer à votre matin — un café, un instant de clarté, et vous repartez.
            </p>
            <p style={{ color: 'var(--ombre)', fontSize: '0.98rem' }}>
              Le thème astral complet va plus loin, pour les jours où vous avez besoin de prendre du recul
              plutôt qu'une lecture rapide.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <SectionDivider />

      {/* 6. Forfaits */}
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
          <h2 style={{ fontSize: '1.7rem', marginBottom: 14 }}>Des forfaits qui respectent votre budget</h2>
          <p style={{ color: 'var(--ombre)', maxWidth: 520, margin: '0 auto 26px' }}>
            Des packs de crédits sans expiration précipitée (45 jours pour en profiter), ou un abonnement
            si Horosphère devient un rendez-vous régulier. Rien n'est imposé au premier jour.
          </p>
          <a href="/tarifs" className="btn btn-primary">Découvrir les forfaits</a>
        </ScrollReveal>
      </section>

      <style>{`
        .top-grid > *{ min-width: 0; }
        .ritual-grid > *{ min-width: 0; }
        @media (max-width: 860px){
          .top-grid{ grid-template-columns: 1fr !important; }
          .ritual-grid{ grid-template-columns: 1fr !important; }
          #parcours{ grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px){
          .photo-frame{ aspect-ratio: 16 / 10 !important; }
        }
      `}</style>
    </main>
  );
}
