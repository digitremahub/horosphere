import { AuthError } from 'next-auth';
import { getLocale, getTranslations } from 'next-intl/server';
import { redirect, getPathname } from '@/i18n/navigation';
import { signIn, authConfigured, passwordAuthConfigured } from '@/lib/auth';
import BrandMark from '@/components/BrandMark';

const PHOTO_FOND = '/images/bg-connexion.png';

export default async function ConnexionPage({ searchParams }: { searchParams: Promise<{ envoye?: string; erreur?: string; error?: string }> }) {
  const params = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations('Connexion');
  const appPath = getPathname({ href: '/app', locale });
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
      await signIn('password', { email, password, redirectTo: appPath });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect({ href: { pathname: '/connexion', query: { erreur: 'motdepasse' } }, locale });
      }
      throw err;
    }
  }

  async function connexionParLien(formData: FormData) {
    'use server';
    const email = String(formData.get('email') || '');
    try {
      await signIn('resend', { email, redirectTo: appPath });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect({ href: { pathname: '/connexion', query: { erreur: 'lien' } }, locale });
      }
      throw err;
    }
  }

  return (
    <main style={{ paddingBottom: 96 }}>
      <div className="page-bandeau">
        <img src={PHOTO_FOND} alt={t('imageAlt')} loading="eager" />
      </div>

      <div className="container-narrow" style={{ position: 'relative' }}>
        <div className="card" style={{ padding: '38px 32px', textAlign: 'center', overflow: 'visible', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -14, left: -14, pointerEvents: 'none' }} aria-hidden="true">
            <BrandMark size={68} />
          </div>

          <h1 style={{ fontSize: '1.7rem', marginBottom: 10 }}>
            {envoye ? t('checkEmailTitle') : t('welcomeTitle')}
          </h1>

          {envoye ? (
            <p style={{ color: 'var(--ombre)' }}>{t('emailSentText')}</p>
          ) : (
            <>
              {erreurMotDePasse && (
                <p style={{ fontSize: '0.86rem', color: 'var(--lever-profond)', marginBottom: 18 }}>
                  {t('wrongPassword')}
                </p>
              )}
              {erreurLien && (
                <p style={{ fontSize: '0.86rem', color: 'var(--lever-profond)', marginBottom: 18 }}>
                  {t('linkError')}
                </p>
              )}

              {passwordAuthConfigured && (
                <>
                  <p style={{ color: 'var(--ombre)', marginBottom: 20 }}>{t('withPasswordText')}</p>
                  <form action={connexionParMotDePasse} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder={t('emailPlaceholder')}
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
                      placeholder={t('passwordPlaceholder')}
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
                    <button type="submit" className="btn btn-primary">{t('login')}</button>
                  </form>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }} aria-hidden="true">
                    <div style={{ flex: 1, height: 1, background: 'var(--trait)' }} />
                    <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--sourdine)', textTransform: 'uppercase' }}>{t('or')}</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--trait)' }} />
                  </div>
                </>
              )}

              <p style={{ color: 'var(--ombre)', marginBottom: 26 }}>
                {t('magicLinkText')}
                {passwordAuthConfigured && t('magicLinkTextWithPassword')}
              </p>

              {!authConfigured && (
                <p style={{ fontSize: '0.82rem', color: 'var(--lever-profond)', marginBottom: 18 }}>
                  {t('notConfigured')}
                </p>
              )}

              <form action={connexionParLien} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder={t('emailPlaceholder')}
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
                  {t('receiveLink')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
