import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getProfile, saveProfile } from '@/lib/profile';
import { dbConfigured } from '@/lib/db';
import ZodiacWheelIllustration from '@/components/ZodiacWheelIllustration';

const inputStyle: React.CSSProperties = {
  padding: '11px 14px',
  borderRadius: 10,
  border: '1px solid var(--trait)',
  background: 'var(--nacre)',
  color: 'var(--encre)',
  fontSize: '0.92rem',
  width: '100%',
};

export default async function ProfilPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/connexion');
  }

  const userId = Number((session!.user as { id?: string }).id);
  let profile: Awaited<ReturnType<typeof getProfile>> = null;
  let error: string | null = null;

  if (dbConfigured) {
    try {
      profile = await getProfile(userId);
    } catch {
      error = 'Impossible de charger le profil pour le moment.';
    }
  } else {
    error = "La base de données n'est pas encore connectée — le profil ne peut pas être enregistré.";
  }

  const mandatory = !profile;

  async function submit(formData: FormData) {
    'use server';
    const session = await auth();
    if (!session?.user) redirect('/connexion');
    const uid = Number((session!.user as { id?: string }).id);

    const prenom = String(formData.get('prenom') || '').trim();
    const nom = String(formData.get('nom') || '').trim();
    const dateNaissance = String(formData.get('date_naissance') || '').trim();
    const heureNaissance = String(formData.get('heure_naissance') || '').trim();
    const lieuNaissance = String(formData.get('lieu_naissance') || '').trim();
    const telephone = String(formData.get('telephone') || '').trim();

    if (!prenom || !nom || !dateNaissance || !lieuNaissance) {
      redirect('/app/profil');
    }

    await saveProfile(uid, {
      prenom,
      nom,
      dateNaissance,
      heureNaissance: heureNaissance || null,
      lieuNaissance,
      telephone: telephone || null,
    });

    redirect('/app');
  }

  return (
    <main className="container-narrow" style={{ paddingTop: 48, paddingBottom: 96, position: 'relative', overflow: 'hidden' }}>
      {/* Fond de page homogène avec /connexion : même image, même dégradé. */}
      <img
        src="/images/bg-formulaire-naissance.png"
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
          background: 'radial-gradient(ellipse at top, transparent 0%, var(--aube) 78%)',
          zIndex: 0,
        }}
      />
      <div
        style={{ position: 'absolute', top: -60, right: -110, pointerEvents: 'none', zIndex: 1 }}
        aria-hidden="true"
      >
        <ZodiacWheelIllustration size={320} opacity={0.22} />
      </div>

      <div style={{ marginBottom: 30, position: 'relative', zIndex: 1 }}>
        {!mandatory && (
          <a href="/app" style={{ fontSize: '0.82rem', color: 'var(--ombre)', textDecoration: 'none' }}>
            ← Mon espace
          </a>
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
        <div className="card" style={{ padding: '14px 18px', marginBottom: 20, borderColor: 'var(--lever)', color: 'var(--lever-profond)', fontSize: '0.86rem', position: 'relative', zIndex: 1 }}>
          {error}
        </div>
      )}

      <form action={submit} className="card" style={{ padding: '26px 24px', display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', zIndex: 1 }}>
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

        <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }}>
          {mandatory ? 'Créer mon profil' : 'Enregistrer'}
        </button>
      </form>
    </main>
  );
}
