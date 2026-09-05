import { getLocale } from 'next-intl/server';
import { redirect, Link } from '@/i18n/navigation';
import { auth } from '@/lib/auth';
import { getProfile, saveProfile } from '@/lib/profile';
import { dbConfigured } from '@/lib/db';
import { validatePassword, setUserPassword, userHasPassword } from '@/lib/password';

const inputStyle: React.CSSProperties = {
  padding: '11px 14px',
  borderRadius: 10,
  border: '1px solid var(--trait)',
  background: 'var(--nacre)',
  color: 'var(--encre)',
  fontSize: '0.92rem',
  width: '100%',
};

export default async function ProfilPage({ searchParams }: { searchParams: Promise<{ mdp?: string }> }) {
  const session = await auth();
  const locale = await getLocale();
  if (!session?.user) {
    redirect({ href: '/connexion', locale });
  }

  const { mdp } = await searchParams;
  const userId = Number((session!.user as { id?: string }).id);
  let profile: Awaited<ReturnType<typeof getProfile>> = null;
  let error: string | null = null;
  let hasPassword = false;

  if (dbConfigured) {
    try {
      profile = await getProfile(userId);
    } catch {
      error = 'Impossible de charger le profil pour le moment.';
    }
    try {
      hasPassword = await userHasPassword(userId);
    } catch {
      hasPassword = false;
    }
  } else {
    error = "La base de données n'est pas encore connectée — le profil ne peut pas être enregistré.";
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

    if (!prenom || !nom || !dateNaissance || !lieuNaissance) {
      redirect({ href: '/app/profil', locale });
    }

    await saveProfile(uid, {
      prenom,
      nom,
      dateNaissance,
      heureNaissance: heureNaissance || null,
      lieuNaissance,
      telephone: telephone || null,
      newsletterOptIn,
    });

    redirect({ href: '/app', locale });
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

  return (
    <main style={{ paddingBottom: 96 }}>
      <div className="page-bandeau">
        <img
          src="/images/profil-astrolabe.webp"
          alt="Une silhouette contemplant le ciel étoilé à travers un astrolabe, en fond du formulaire de naissance."
          loading="lazy"
        />
      </div>

      <div className="container-narrow">
        <div style={{ marginBottom: 30 }}>
          {!mandatory && (
            <Link href="/app" style={{ fontSize: '0.82rem', color: 'var(--ombre)', textDecoration: 'none' }}>
              ← Mon espace
            </Link>
          )}
          <h1 style={{ fontSize: '1.6rem', marginTop: mandatory ? 0 : 10 }}>
            {mandatory ? 'Bienvenue — complétez votre profil' : 'Mon profil'}
          </h1>
          <p style={{ color: 'var(--ombre)', fontSize: '0.9rem' }}>
            {mandatory
              ? "Ces informations permettent de créer un profil vraiment personnalisé et votre thème astral. C'est nécessaire avant de générer votre première lecture."
              : 'Ces informations alimentent votre thème astral et vos lectures personnalisées.'}
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
              <label htmlFor="prenom" className="field-label">Prénom</label>
              <input id="prenom" name="prenom" type="text" required defaultValue={profile?.prenom ?? ''} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="nom" className="field-label">Nom</label>
              <input id="nom" name="nom" type="text" required defaultValue={profile?.nom ?? ''} style={inputStyle} />
            </div>
          </div>

          <div>
            <label htmlFor="date_naissance" className="field-label">Date de naissance</label>
            <input
              id="date_naissance"
              name="date_naissance"
              type="date"
              required
              defaultValue={profile?.date_naissance ?? ''}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="heure_naissance" className="field-label">Heure de naissance (optionnel)</label>
              <input
                id="heure_naissance"
                name="heure_naissance"
                type="time"
                defaultValue={profile?.heure_naissance ? profile.heure_naissance.slice(0, 5) : ''}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 2 }}>
              <label htmlFor="lieu_naissance" className="field-label">Lieu de naissance</label>
              <input
                id="lieu_naissance"
                name="lieu_naissance"
                type="text"
                required
                placeholder="Ville, pays"
                defaultValue={profile?.lieu_naissance ?? ''}
                style={inputStyle}
              />
            </div>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--sourdine)', marginTop: -8 }}>
            Avec l'heure exacte, votre thème astral inclut votre véritable ascendant et votre lune natale
            — sans elle, ces éléments restent indisponibles plutôt qu'approximés.
          </p>

          <div>
            <label htmlFor="telephone" className="field-label">Téléphone (optionnel)</label>
            <input
              id="telephone"
              name="telephone"
              type="tel"
              placeholder="06 12 34 56 78"
              defaultValue={profile?.telephone ?? ''}
              style={inputStyle}
            />
            <p style={{ fontSize: '0.78rem', color: 'var(--sourdine)', marginTop: 6 }}>
              Pour recevoir votre horoscope chaque matin — bientôt disponible.
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
              Recevoir la newsletter hebdomadaire (actualités Horosphère) — désinscription possible à tout moment
              depuis chaque e-mail.
            </span>
          </label>

          <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }}>
            {mandatory ? 'Créer mon profil' : 'Enregistrer'}
          </button>
        </form>

        {!mandatory && dbConfigured && (
          <div className="card" style={{ padding: '26px 24px' }}>
            <div className="pill" style={{ marginBottom: 14 }}>Sécurité</div>
            <h2 style={{ fontSize: '1.1rem', marginBottom: 8 }}>
              {hasPassword ? 'Changer mon mot de passe' : 'Définir un mot de passe'}
            </h2>
            <p style={{ color: 'var(--ombre)', fontSize: '0.86rem', marginBottom: 18 }}>
              {hasPassword
                ? 'Vous pouvez déjà vous connecter avec un mot de passe. Modifiez-le ici si besoin.'
                : "Le lien magique par e-mail reste toujours disponible. Ajoutez un mot de passe si vous préférez vous connecter directement, sans attendre l'e-mail."}
            </p>

            {mdp === 'ok' && (
              <p style={{ fontSize: '0.86rem', color: 'var(--lever-profond)', marginBottom: 14 }}>
                Mot de passe enregistré.
              </p>
            )}
            {mdp === 'erreur' && (
              <p style={{ fontSize: '0.86rem', color: 'var(--lever-profond)', marginBottom: 14 }}>
                Les deux mots de passe ne correspondent pas, ou le mot de passe est trop court (8 caractères minimum).
              </p>
            )}

            <form action={submitPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label htmlFor="password" className="field-label">Nouveau mot de passe</label>
                <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" style={inputStyle} />
              </div>
              <div>
                <label htmlFor="password_confirmation" className="field-label">Confirmez le mot de passe</label>
                <input id="password_confirmation" name="password_confirmation" type="password" required minLength={8} autoComplete="new-password" style={inputStyle} />
              </div>
              <button type="submit" className="btn btn-ghost" style={{ alignSelf: 'flex-start' }}>
                {hasPassword ? 'Mettre à jour' : 'Créer mon mot de passe'}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
