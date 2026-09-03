import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getBalance } from '@/lib/credits';
import { getProfile } from '@/lib/profile';
import { dbConfigured } from '@/lib/db';
import { signFromBirthdate } from '@/lib/zodiac';
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

  let balance = 0;
  let balanceError: string | null = null;

  if (dbConfigured) {
    try {
      balance = await getBalance(userId);
    } catch (err) {
      balanceError = 'Impossible de lire le solde de crédits pour le moment.';
    }
  } else {
    balanceError = "La base de données n'est pas encore connectée — les crédits ne peuvent pas être suivis.";
  }

  return (
    <main className="container" style={{ paddingTop: 48, paddingBottom: 96 }}>
      <div className="photo-frame" style={{ height: 150, marginBottom: 28 }}>
        <img
          src="/images/bg-dashboard.png"
          alt="Les rouages dorés d'un astrolabe — le mécanisme derrière votre tableau de bord."
          loading="lazy"
        />
      </div>

      <Dashboard
        userName={session!.user!.name || session!.user!.email || 'vous'}
        userSign={userSign}
        initialBalance={balance}
        balanceError={balanceError}
      />
    </main>
  );
}
