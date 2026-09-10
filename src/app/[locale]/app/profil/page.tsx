import { getLocale, getTranslations } from 'next-intl/server';
import { redirect, Link } from '@/i18n/navigation';
import { auth, signOut } from '@/lib/auth';
import { getProfile, saveProfile } from '@/lib/profile';
import { dbConfigured } from '@/lib/db';
import { validatePassword, setUserPassword, userHasPassword } from '@/lib/password';
import { changerAdresseEmail, EmailDejaUtiliseError } from '@/lib/account';
import { lienParrainage, CREDITS_PARRAIN, CREDITS_FILLEUL } from '@/lib/referral';
import { statutSuiviUtilisateur, soumettrePreuveSuivi, DemandeDejaEnCoursError, PLATEFORMES_SUIVI, CREDITS_SUIVI, type PlateformeSuivi } from '@/lib/followRewards';
import { SOCIAL_LINKS } from '@/lib/socialLinks';
import ShareButton from '@/components/ShareButton';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputStyle: React.CSSProperties = {
  padding: '11px 14px',
  borderRadius: 10,
  border: '1px solid var(--trait)',
  background: 'var(--nacre)',
  color: 'var(--encre)',
  fontSize: '0.92rem',
  width: '100%',
};

export default async function ProfilPage({ searchParams }: { searchParams: Promise<{ mdp?: string; naissance?: string; email?: string; suivi?: string }> }) {
  const session = await auth();
  const locale = await getLocale();
  const t = await getTranslations('Profil');
  if (!session?.user) {
    redirect({ href: '/connexion', locale });
  }

  const { mdp, naissance, email: emailStatut, suivi: suiviStatut } = await searchParams;
  const userId = Number((session!.user as { id?: string }).id);
  let profile: Awaited<ReturnType<typeof getProfile>> = null;
  let error: string | null = null;
  let hasPassword = false;
  let suiviParPlateforme: Awaited<ReturnType<typeof statutSuiviUtilisateur>> = {};

  if (dbConfigured) {
    try {
      profile = await getProfile(userId);
    } catch {
      error = t('loadError');
    }
    try {
      hasPassword = await userHasPassword(userId);
    } catch {
      hasPassword = false;
    }
    try {
      suiviParPlateforme = await statutSuiviUtilisateur(userId);
    } catch {
      suiviParPlateforme = {};
    }
  } else {
    error = t('dbNotConnected');
  }

  const mandatory = !profile;

  async function submit(formData: FormData) {
    'use server';
    const session = await auth();
    if (!session?.user) redirect({ href: '/connexion', locale });
    const uid = Number((session!.user as { id?: string }).id);

    const prenom = String(formData.get('prenom') || '').trim();
    const nom = String(formData.get('nom') || '').trim();
    const dateNaissance = String(formData.get('date_naissance') || '').trim();
    const heureNaissance = String(formData.get('heure_naissance') || '').trim();
    const lieuNaissance = String(formData.get('lieu_naissance') || '').trim();
    const telephone = String(formData.get('telephone') || '').trim();
    const newsletterOptIn = formData.get('newsletter_opt_in') === 'on';
    const horoscopeEmailOptIn = formData.get('horoscope_email_opt_in') === 'on';

    if (!prenom || !nom || !dateNaissance || !lieuNaissance) {
      redirect({ href: '/app/profil', locale });
    }

    // Retour testeur (09/09) : une date de naissance dans le futur passait
    // sans contrôle. L'attribut `max` sur le champ bloque déjà les
    // navigateurs qui le respectent, mais un formulaire peut toujours être
    // soumis directement (devtools, requête manuelle) — la vraie garantie
    // doit être ici, côté serveur.
    if (dateNaissance > new Date().toISOString().slice(0, 10)) {
      redirect({ href: { pathname: '/app/profil', query: { naissance: 'futur' } }, locale });
    }

    await saveProfile(uid, {
      prenom,
      nom,
      dateNaissance,
      heureNaissance: heureNaissance || null,
      lieuNaissance,
      telephone: telephone || null,
      newsletterOptIn,
      horoscopeEmailOptIn,
    });

    redirect({ href: '/app', locale });
  }

  async function changerEmail(formData: FormData) {
    'use server';
    const session = await auth();
    if (!session?.user) redirect({ href: '/connexion', locale });
    const uid = Number((session!.user as { id?: string }).id);

    const nouvelEmail = String(formData.get('nouvel_email') || '').trim().toLowerCase();
    if (!EMAIL_REGEX.test(nouvelEmail)) {
      redirect({ href: { pathname: '/app/profil', query: { email: 'invalide' } }, locale });
    }

    try {
      await changerAdresseEmail(uid, nouvelEmail);
    } catch (err) {
      const dejaPris = err instanceof EmailDejaUtiliseError;
      redirect({ href: { pathname: '/app/profil', query: { email: dejaPris ? 'existe' : 'erreur' } }, locale });
    }

    // L'e-mail sert d'identifiant de connexion : la session en cours (JWT)
    // garde l'ancienne adresse tant qu'elle n'est pas renouvelée. On
    // déconnecte donc immédiatement plutôt que d'afficher une adresse
    // périmée — la personne se reconnecte avec la nouvelle juste après.
    await signOut({ redirectTo: '/connexion?email=change' });
  }

  async function submitPassword(formData: FormData) {
    'use server';
    const session = await auth();
    if (!session?.user) redirect({ href: '/connexion', locale });
    const uid = Number((session!.user as { id?: string }).id);

    const password = String(formData.get('password') || '');
    const confirmation = String(formData.get('password_confirmation') || '');

    if (password !== confirmation || validatePassword(password)) {
      redirect({ href: { pathname: '/app/profil', query: { mdp: 'erreur' } }, locale });
    }

    await setUserPassword(uid, password);
    redirect({ href: { pathname: '/app/profil', query: { mdp: 'ok' } }, locale });
  }

  async function soumettreSuivi(formData: FormData) {
    'use server';
    const session = await auth();
    if (!session?.user) redirect({ href: '/connexion', locale });
    const uid = Number((session!.user as { id?: string }).id);

    const plateforme = String(formData.get('plateforme') || '') as PlateformeSuivi;
    if (!PLATEFORMES_SUIVI.includes(plateforme)) {
      redirect({ href: { pathname: '/app/profil', query: { suivi: 'erreur' } }, locale });
    }

    const fichier = formData.get('capture');
    if (!(fichier instanceof File) || fichier.size === 0) {
      redirect({ href: { pathname: '/app/profil', query: { suivi: 'manquant' } }, locale });
    }
    // 8 Mo — largement suffisant pour une capture d'écran de téléphone,
    // évite qu'un fichier disproportionné ne consomme le stockage Blob.
    if ((fichier as File).size > 8 * 1024 * 1024) {
      redirect({ href: { pathname: '/app/profil', query: { suivi: 'trop_lourd' } }, locale });
    }

    const buffer = Buffer.from(await (fichier as File).arrayBuffer());
    const contentType = (fichier as File).type || 'image/jpeg';

    try {
      await soumettrePreuveSuivi(uid, plateforme, { buffer, contentType });
    } catch (err) {
      const dejaEnCours = err instanceof DemandeDejaEnCoursError;
      redirect({ href: { pathname: '/app/profil', query: { suivi: dejaEnCours ? 'deja' : 'erreur' } }, locale });
    }

    redirect({ href: { pathname: '/app/profil', query: { suivi: 'envoye' } }, locale });
  }

  return (
    <main style={{ paddingBottom: 96 }}>
      <div className="page-bandeau">
        <img
          src="/images/profil-astrolabe.webp"
          alt={t('imageAlt')}
          loading="lazy"
        />
      </div>

      <div className="container-narrow">
        <div style={{ marginBottom: 30 }}>
          {!mandatory && (
            <Link href="/app" style={{ fontSize: '0.82rem', color: 'var(--ombre)', textDecoration: 'none' }}>
              {t('backToSpace')}
            </Link>
          )}
          <h1 style={{ fontSize: '1.6rem', marginTop: mandatory ? 0 : 10 }}>
            {mandatory ? t('welcomeTitle') : t('myProfileTitle')}
          </h1>
          <p style={{ color: 'var(--ombre)', fontSize: '0.9rem' }}>
            {mandatory ? t('introMandatory') : t('introOptional')}
          </p>
        </div>

        {error && (
          <div className="card" style={{ padding: '14px 18px', marginBottom: 20, borderColor: 'var(--lever)', color: 'var(--lever-profond)', fontSize: '0.86rem' }}>
            {error}
          </div>
        )}

        <form action={submit} className="card" style={{ padding: '26px 24px', display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="prenom" className="field-label">{t('firstName')}</label>
              <input id="prenom" name="prenom" type="text" required defaultValue={profile?.prenom ?? ''} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="nom" className="field-label">{t('lastName')}</label>
              <input id="nom" name="nom" type="text" required defaultValue={profile?.nom ?? ''} style={inputStyle} />
            </div>
          </div>

          <div>
            <label htmlFor="date_naissance" className="field-label">{t('birthDate')}</label>
            <input
              id="date_naissance"
              name="date_naissance"
              type="date"
              required
              max={new Date().toISOString().slice(0, 10)}
              defaultValue={profile?.date_naissance ?? ''}
              style={inputStyle}
            />
            {naissance === 'futur' && (
              <p style={{ fontSize: '0.82rem', color: 'var(--lever-profond)', marginTop: 6 }}>
                {t('futureDateError')}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="heure_naissance" className="field-label">{t('birthTime')}</label>
              <input
                id="heure_naissance"
                name="heure_naissance"
                type="time"
                defaultValue={profile?.heure_naissance ? profile.heure_naissance.slice(0, 5) : ''}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 2 }}>
              <label htmlFor="lieu_naissance" className="field-label">{t('birthPlace')}</label>
              <input
                id="lieu_naissance"
                name="lieu_naissance"
                type="text"
                required
                placeholder={t('birthPlacePlaceholder')}
                defaultValue={profile?.lieu_naissance ?? ''}
                style={inputStyle}
              />
            </div>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--sourdine)', marginTop: -8 }}>
            {t('birthTimeHint')}
          </p>

          <div>
            <label htmlFor="telephone" className="field-label">{t('phone')}</label>
            <input
              id="telephone"
              name="telephone"
              type="tel"
              placeholder={t('phonePlaceholder')}
              defaultValue={profile?.telephone ?? ''}
              style={inputStyle}
            />
            <p style={{ fontSize: '0.78rem', color: 'var(--sourdine)', marginTop: 6 }}>
              {t('phoneHint')}
            </p>
          </div>

          <label htmlFor="newsletter_opt_in" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.86rem', cursor: 'pointer' }}>
            <input
              id="newsletter_opt_in"
              name="newsletter_opt_in"
              type="checkbox"
              defaultChecked={profile ? profile.newsletter_opt_in : true}
              style={{ marginTop: 3 }}
            />
            <span>
              {t('newsletterLabel')}
            </span>
          </label>

          <label htmlFor="horoscope_email_opt_in" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.86rem', cursor: 'pointer' }}>
            <input
              id="horoscope_email_opt_in"
              name="horoscope_email_opt_in"
              type="checkbox"
              defaultChecked={profile ? profile.horoscope_email_opt_in : false}
              style={{ marginTop: 3 }}
            />
            <span>
              {t('horoscopeEmailLabel')}
            </span>
          </label>

          <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }}>
            {mandatory ? t('createProfile') : t('save')}
          </button>
        </form>

        {dbConfigured && (
          <div className="card" style={{ padding: '26px 24px', marginBottom: 28 }}>
            <div className="pill" style={{ marginBottom: 14 }}>{t('securityPill')}</div>
            <h2 style={{ fontSize: '1.1rem', marginBottom: 8 }}>{t('emailTitle')}</h2>
            <p style={{ color: 'var(--ombre)', fontSize: '0.86rem', marginBottom: 4 }}>{t('emailCurrentLabel')}</p>
            <p style={{ fontWeight: 600, marginBottom: 18 }}>{session!.user!.email}</p>

            {emailStatut === 'invalide' && (
              <p style={{ fontSize: '0.86rem', color: 'var(--lever-profond)', marginBottom: 14 }}>{t('emailInvalid')}</p>
            )}
            {emailStatut === 'existe' && (
              <p style={{ fontSize: '0.86rem', color: 'var(--lever-profond)', marginBottom: 14 }}>{t('emailExists')}</p>
            )}
            {emailStatut === 'erreur' && (
              <p style={{ fontSize: '0.86rem', color: 'var(--lever-profond)', marginBottom: 14 }}>{t('emailError')}</p>
            )}

            <form action={changerEmail} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label htmlFor="nouvel_email" className="field-label">{t('newEmailLabel')}</label>
                <input id="nouvel_email" name="nouvel_email" type="email" required placeholder="nouvelle@adresse.com" style={inputStyle} />
              </div>
              <button type="submit" className="btn btn-ghost" style={{ alignSelf: 'flex-start' }}>
                {t('changeEmailBtn')}
              </button>
            </form>
            <p style={{ fontSize: '0.76rem', color: 'var(--sourdine)', marginTop: 10 }}>{t('emailChangeHint')}</p>
          </div>
        )}

        {dbConfigured && (
          <div className="card" style={{ padding: '26px 24px' }}>
            <div className="pill" style={{ marginBottom: 14 }}>{t('securityPill')}</div>
            <h2 style={{ fontSize: '1.1rem', marginBottom: 8 }}>
              {hasPassword ? t('changePassword') : t('setPassword')}
            </h2>
            <p style={{ color: 'var(--ombre)', fontSize: '0.86rem', marginBottom: 18 }}>
              {hasPassword ? t('passwordTextHas') : t('passwordTextNone')}
            </p>

            {mdp === 'ok' && (
              <p style={{ fontSize: '0.86rem', color: 'var(--lever-profond)', marginBottom: 14 }}>
                {t('passwordSaved')}
              </p>
            )}
            {mdp === 'erreur' && (
              <p style={{ fontSize: '0.86rem', color: 'var(--lever-profond)', marginBottom: 14 }}>
                {t('passwordError')}
              </p>
            )}

            <form action={submitPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label htmlFor="password" className="field-label">{t('newPassword')}</label>
                <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" style={inputStyle} />
              </div>
              <div>
                <label htmlFor="password_confirmation" className="field-label">{t('confirmPassword')}</label>
                <input id="password_confirmation" name="password_confirmation" type="password" required minLength={8} autoComplete="new-password" style={inputStyle} />
              </div>
              <button type="submit" className="btn btn-ghost" style={{ alignSelf: 'flex-start' }}>
                {hasPassword ? t('updatePassword') : t('createPasswordBtn')}
              </button>
            </form>
          </div>
        )}

        {!mandatory && dbConfigured && (
          <div className="card" style={{ padding: '26px 24px', marginTop: 28 }}>
            <div className="pill" style={{ marginBottom: 14 }}>{t('referralPill')}</div>
            <h2 style={{ fontSize: '1.1rem', marginBottom: 8 }}>{t('referralTitle')}</h2>
            <p style={{ color: 'var(--ombre)', fontSize: '0.86rem', marginBottom: 4 }}>
              {t('referralText', { creditsParrain: CREDITS_PARRAIN, creditsFilleul: CREDITS_FILLEUL })}
            </p>
            <ShareButton
              shareText={t('referralShareText', { creditsFilleul: CREDITS_FILLEUL })}
              shareUrl={lienParrainage(userId)}
              title={t('referralBannerTitle')}
              subtitle={t('referralBannerSubtitle')}
              label={t('referralButton')}
              copiedLabel={t('referralCopied')}
            />
          </div>
        )}

        {!mandatory && dbConfigured && (
          <div className="card" style={{ padding: '26px 24px', marginTop: 28 }}>
            <div className="pill" style={{ marginBottom: 14 }}>{t('followPill')}</div>
            <h2 style={{ fontSize: '1.1rem', marginBottom: 8 }}>{t('followTitle')}</h2>
            <p style={{ color: 'var(--ombre)', fontSize: '0.86rem', marginBottom: 16 }}>
              {t('followSubtitle', { credits: CREDITS_SUIVI })}
            </p>

            {suiviStatut && (
              <div
                className="card"
                style={{
                  padding: '10px 14px',
                  marginBottom: 16,
                  fontSize: '0.84rem',
                  boxShadow: 'none',
                  borderColor: suiviStatut === 'envoye' ? 'var(--lever)' : 'var(--ambre)',
                  color: suiviStatut === 'envoye' ? 'var(--lever-profond)' : 'var(--ambre)',
                }}
              >
                {t(`followBanner_${suiviStatut}`)}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {PLATEFORMES_SUIVI.map((plateforme) => {
                const lien = SOCIAL_LINKS[plateforme];
                const demande = suiviParPlateforme[plateforme];
                const nom = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok' }[plateforme];
                const emoji = { instagram: '📸', facebook: '👍', tiktok: '🎵' }[plateforme];

                return (
                  <div key={plateforme} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', borderTop: '1px solid var(--trait)', paddingTop: 14 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{emoji} {nom}</div>

                    {!lien && <span style={{ fontSize: '0.82rem', color: 'var(--sourdine)' }}>{t('followComingSoon')}</span>}

                    {lien && demande?.statut === 'approuve' && (
                      <span style={{ fontSize: '0.82rem', color: 'var(--lever-profond)', fontWeight: 600 }}>
                        {t('followApproved', { credits: demande.credits })}
                      </span>
                    )}

                    {lien && demande?.statut === 'en_attente' && (
                      <span style={{ fontSize: '0.82rem', color: 'var(--ambre)' }}>{t('followPending')}</span>
                    )}

                    {lien && demande?.statut !== 'approuve' && demande?.statut !== 'en_attente' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        {demande?.statut === 'rejete' && (
                          <span style={{ fontSize: '0.78rem', color: 'var(--sourdine)' }}>{t('followRejected')}</span>
                        )}
                        <a href={lien} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
                          {t('followSuivreBtn')}
                        </a>
                        <form action={soumettreSuivi} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input type="hidden" name="plateforme" value={plateforme} />
                          <input type="file" name="capture" accept="image/*" required style={{ fontSize: '0.78rem', maxWidth: 160 }} />
                          <button type="submit" className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
                            {t('followSendProof')}
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
