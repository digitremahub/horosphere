import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getBalance, hasActiveSubscription } from '@/lib/credits';
import { getProfile } from '@/lib/profile';
import { dbConfigured } from '@/lib/db';
import { signFromBirthdate } from '@/lib/zodiac';
import { calculerThemeNatal } from '@/lib/natal';
import Dashboard from '@/components/Dashboard';

export default async function AppPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/connexion');
  }

  const userId = Number((session!.user as { id?: string }).id);

  // Profil de naissance obligatoire avant tout usage — voir /app/profil.
  // Le signe affiché vient toujours de là, jamais d'un choix libre.
  let profile: Awaited<ReturnType<typeof getProfile>> = null;
  if (dbConfigured) {
    try {
      profile = await getProfile(userId);
    } catch {
      profile = null; // erreur de lecture transitoire : ne pas bloquer l'accès
    }
    if (!profile) {
      redirect('/app/profil');
    }
  }

  const userSign = profile
    ? (() => {
        const [, m, d] = profile.date_naissance.split('-').map(Number);
        return signFromBirthdate(m, d);
      })()
    : { key: 'belier', nom: 'Bélier', symbole: '♈', dates: '21 mars – 19 avril' };

  // Ascendant : gratuit, jamais payant — un simple fait calculé (voir
  // lib/natal.ts), pas une lecture générée. Disponible dès que l'heure de
  // naissance et le lieu (géocodé à l'enregistrement du profil) sont là ;
  // `null` sinon, jamais approximé.
  const ascendant =
    profile?.heure_naissance && profile.lieu_latitude != null && profile.lieu_longitude != null && profile.lieu_timezone
      ? calculerThemeNatal(
          profile.date_naissance,
          profile.heure_naissance.slice(0, 5),
          profile.lieu_timezone,
          profile.lieu_latitude,
          profile.lieu_longitude
        )?.ascendant.signe ?? null
      : null;

  let balance = 0;
  let balanceError: string | null = null;
  let hasSubscription = false;

  if (dbConfigured) {
    try {
      balance = await getBalance(userId);
    } catch (err) {
      balanceError = 'Impossible de lire le solde de crédits pour le moment.';
    }
    try {
      hasSubscription = await hasActiveSubscription(userId);
    } catch {
      hasSubscription = false; // erreur de lecture transitoire : traiter comme non-abonné plutôt que bloquer l'affichage
    }
  } else {
    balanceError = "La base de données n'est pas encore connectée — les crédits ne peuvent pas être suivis.";
  }

  return (
    <main style={{ paddingBottom: 96 }}>
      <div className="page-bandeau">
        <img
          src="/images/bg-dashboard.png"
          alt="Les rouages dorés d'un astrolabe — le mécanisme derrière votre tableau de bord."
          loading="lazy"
        />
      </div>

      <div className="container">
        <Dashboard
          userName={session!.user!.name || session!.user!.email || 'vous'}
          userSign={userSign}
          ascendant={ascendant ? { nom: ascendant.nom, symbole: ascendant.symbole } : null}
          initialBalance={balance}
          balanceError={balanceError}
          hasSubscription={hasSubscription}
        />
      </div>
    </main>
  );
}
