import { signIn } from '@/lib/auth';
import { authConfigured } from '@/lib/auth';
import BrandMark from '@/components/BrandMark';
import ZodiacWheelIllustration from '@/components/ZodiacWheelIllustration';

const PHOTO_FOND = '/images/bg-connexion.png';

export default async function ConnexionPage({ searchParams }: { searchParams: Promise<{ envoye?: string }> }) {
  const params = await searchParams;
  const envoye = params?.envoye === '1';

  return (
    <main className="container-narrow" style={{ paddingTop: 72, paddingBottom: 96, position: 'relative', overflow: 'hidden' }}>
      <img
        src={PHOTO_FOND}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 0.3,
          zIndex: 0,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 0%, var(--aube) 78%)',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
        aria-hidden="true"
      >
        <ZodiacWheelIllustration size={520} spin opacity={0.18} />
      </div>

      <div className="card" style={{ padding: '38px 32px', textAlign: 'center', overflow: 'visible', position: 'relative', zIndex: 2 }}>
        <div style={{ position: 'absolute', top: -14, left: -14, pointerEvents: 'none' }} aria-hidden="true">
          <BrandMark size={68} />
        </div>

        <h1 style={{ fontSize: '1.7rem', marginBottom: 10 }}>
          {envoye ? 'Vérifiez votre boîte mail' : 'Bienvenue'}
        </h1>

        {envoye ? (
          <p style={{ color: 'var(--ombre)' }}>
            Un lien de connexion vient de vous être envoyé. Ouvrez-le depuis cet appareil pour accéder à votre espace.
          </p>
        ) : (
          <>
            <p style={{ color: 'var(--ombre)', marginBottom: 26 }}>
              Un e-mail suffit — pas de mot de passe à retenir. Nous vous envoyons un lien de connexion valable
              quelques minutes.
            </p>

            {!authConfigured && (
              <p style={{ fontSize: '0.82rem', color: 'var(--lever-profond)', marginBottom: 18 }}>
                La connexion par e-mail n'est pas encore activée sur cet environnement (base de données ou clé Resend manquante).
              </p>
            )}

            <form
              action={async (formData: FormData) => {
                'use server';
                await signIn('resend', { email: formData.get('email'), redirectTo: '/app' });
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <input
                type="email"
                name="email"
                required
                placeholder="vous@exemple.com"
                disabled={!authConfigured}
                style={{
                  padding: '13px 16px',
                  borderRadius: 12,
                  border: '1px solid var(--trait)',
                  background: 'var(--nacre)',
                  color: 'var(--encre)',
                  fontSize: '0.95rem',
                }}
              />
              <button type="submit" className="btn btn-primary" disabled={!authConfigured}>
                Recevoir mon lien de connexion
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
