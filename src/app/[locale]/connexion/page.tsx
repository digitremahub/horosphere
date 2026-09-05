import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { signIn, authConfigured, passwordAuthConfigured } from '@/lib/auth';
import BrandMark from '@/components/BrandMark';

const PHOTO_FOND = '/images/bg-connexion.png';

export default async function ConnexionPage({ searchParams }: { searchParams: Promise<{ envoye?: string; erreur?: string; error?: string }> }) {
  const params = await searchParams;
  const envoye = params?.envoye === '1';
  const erreurMotDePasse = params?.erreur === 'motdepasse';
  // "erreur" = nos propres redirections (mot de passe, échec attrapé du
  // lien) ; "error" = celui qu'Auth.js ajoute lui-même quand il gère
  // l'erreur avant même que notre code n'ait la main (ex. Resend qui
  // refuse d'envoyer) — voir pages.error dans lib/auth.ts.
  const erreurLien = params?.erreur === 'lien' || Boolean(params?.error);

  async function connexionParMotDePasse(formData: FormData) {
    'use server';
    const email = String(formData.get('email') || '');
    const password = String(formData.get('password') || '');
    try {
      await signIn('password', { email, password, redirectTo: '/app' });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect('/connexion?erreur=motdepasse');
      }
      throw err;
    }
  }

  async function connexionParLien(formData: FormData) {
    'use server';
    const email = String(formData.get('email') || '');
    try {
      await signIn('resend', { email, redirectTo: '/app' });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect('/connexion?erreur=lien');
      }
      throw err;
    }
  }

  return (
    <main style={{ paddingBottom: 96 }}>
      <div className="page-bandeau">
        <img src={PHOTO_FOND} alt="Un ciel étoilé, en fond de la page de connexion." loading="eager" />
      </div>

      <div className="container-narrow" style={{ position: 'relative' }}>
        <div className="card" style={{ padding: '38px 32px', textAlign: 'center', overflow: 'visible', position: 'relative' }}>
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
              {erreurMotDePasse && (
                <p style={{ fontSize: '0.86rem', color: 'var(--lever-profond)', marginBottom: 18 }}>
                  E-mail ou mot de passe incorrect.
                </p>
              )}
              {erreurLien && (
                <p style={{ fontSize: '0.86rem', color: 'var(--lever-profond)', marginBottom: 18 }}>
                  La connexion a rencontré un problème. Réessayez dans un instant, ou contactez-nous si ça
                  persiste.
                </p>
              )}

              {passwordAuthConfigured && (
                <>
                  <p style={{ color: 'var(--ombre)', marginBottom: 20 }}>Connectez-vous avec votre e-mail et votre mot de passe.</p>
                  <form action={connexionParMotDePasse} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="vous@exemple.com"
                      autoComplete="email"
                      style={{
                        padding: '13px 16px',
                        borderRadius: 12,
                        border: '1px solid var(--trait)',
                        background: 'var(--nacre)',
                        color: 'var(--encre)',
                        fontSize: '0.95rem',
                      }}
                    />
                    <input
                      type="password"
                      name="password"
                      required
                      placeholder="Mot de passe"
                      autoComplete="current-password"
                      style={{
                        padding: '13px 16px',
                        borderRadius: 12,
                        border: '1px solid var(--trait)',
                        background: 'var(--nacre)',
                        color: 'var(--encre)',
                        fontSize: '0.95rem',
                      }}
                    />
                    <button type="submit" className="btn btn-primary">Se connecter</button>
                  </form>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }} aria-hidden="true">
                    <div style={{ flex: 1, height: 1, background: 'var(--trait)' }} />
                    <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--sourdine)', textTransform: 'uppercase' }}>ou</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--trait)' }} />
                  </div>
                </>
              )}

              <p style={{ color: 'var(--ombre)', marginBottom: 26 }}>
                Un e-mail suffit — pas de mot de passe à retenir. Nous vous envoyons un lien de connexion valable
                quelques minutes.
                {passwordAuthConfigured && ' Vous pourrez définir un mot de passe une fois connecté, depuis votre profil.'}
              </p>

              {!authConfigured && (
                <p style={{ fontSize: '0.82rem', color: 'var(--lever-profond)', marginBottom: 18 }}>
                  La connexion par e-mail n'est pas encore activée sur cet environnement (base de données ou clé Resend manquante).
                </p>
              )}

              <form action={connexionParLien} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                <button type="submit" className="btn btn-ghost" disabled={!authConfigured}>
                  Recevoir mon lien de connexion
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
