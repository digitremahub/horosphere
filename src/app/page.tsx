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
  { titre: 'Vous lisez, à votre rythme', texte: 'Chaque lecture consomme quelques crédits. Vous ne payez que ce que vous utilisez, jamais un abonnement imposé.' },
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
      <section className="container" style={{ paddingTop: 64, paddingBottom: 56, position: 'relative', overflow: 'hidden' }}>
        <div
          style={{ position: 'absolute', top: -40, right: -60, pointerEvents: 'none' }}
          className="hero-arc"
        >
          <AstrolabeIllustration size={340} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 56, alignItems: 'center', position: 'relative' }} className="hero-grid">
          <div>
            <div className="pill hero-in-1" style={{ marginBottom: 18 }}>Horoscope IA quotidien</div>
            <h1 className="hero-in-2" style={{ fontSize: 'clamp(2.2rem, 4vw, 3.1rem)', marginBottom: 20 }}>
              Un instant de clarté, <em style={{ fontStyle: 'italic', color: 'var(--lever-profond)' }}>chaque jour</em>, sans pression.
            </h1>
            <p className="hero-in-3" style={{ color: 'var(--ombre)', fontSize: '1.05rem', maxWidth: 460, marginBottom: 28 }}>
              Horosphère écrit votre lecture du jour à partir de votre signe — et bientôt de votre thème complet.
              Pensé pour devenir une habitude douce, pas une dépense qu'on regrette.
            </p>
            <div className="hero-in-4" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <a href="/connexion" className="btn btn-primary">Commencer gratuitement</a>
              <a href="/tarifs" className="btn btn-ghost">Voir les forfaits</a>
            </div>
          </div>

          <div className="hero-in-card">
            <FreeTeaser />
          </div>
        </div>
      </section>

      <SectionDivider />

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
            <div className="pill" style={{ marginBottom: 16 }}>Un rituel, pas une corvée</div>
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

      <section className="container" style={{ padding: '8px 24px 48px' }}>
        <ScrollReveal>
          <div style={{ textAlign: 'center', maxWidth: 520, margin: '0 auto 28px' }}>
            <div className="pill" style={{ marginBottom: 14 }}>Chaque jour</div>
            <h2 style={{ fontSize: '1.5rem' }}>La lune du jour et son influence</h2>
          </div>
          <MoonOfTheDay />
        </ScrollReveal>
      </section>

      <SectionDivider />

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
        .hero-grid > *{ min-width: 0; }
        .ritual-grid > *{ min-width: 0; }
        @media (max-width: 860px){
          .hero-grid{ grid-template-columns: 1fr !important; }
          .ritual-grid{ grid-template-columns: 1fr !important; }
          #parcours{ grid-template-columns: 1fr !important; }
          .hero-arc{ display: none; }
        }
        @media (max-width: 480px){
          .photo-frame{ aspect-ratio: 16 / 10 !important; }
        }
      `}</style>
    </main>
  );
}
