import Link from 'next/link';
import { auth, signOut } from '@/lib/auth';
import Logo from './Logo';
import MoonPhase from './MoonPhase';

export default async function SiteHeader() {
  const session = await auth();

  return (
    <header style={{ borderBottom: '1px solid var(--trait)' }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 10, minHeight: 72, padding: '14px 24px' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <Logo />
          <span className="display" style={{ fontSize: '1.25rem', fontStyle: 'italic', color: 'var(--encre)' }}>Horosphère</span>
          <MoonPhase size={18} />
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '0.92rem', flexWrap: 'wrap' }}>
          <Link href="/" style={{ textDecoration: 'none', color: 'var(--ombre)' }}>Accueil</Link>
          <Link href="/actualites" style={{ textDecoration: 'none', color: 'var(--ombre)' }}>Actualités</Link>
          <Link href="/tarifs" style={{ textDecoration: 'none', color: 'var(--ombre)' }}>Tarifs</Link>
          {session?.user ? (
            <>
              <Link href="/app" style={{ textDecoration: 'none', color: 'var(--ombre)' }}>Mon espace</Link>
              <Link href="/app/historique" style={{ textDecoration: 'none', color: 'var(--ombre)' }}>Historique</Link>
              <Link href="/app/profil" style={{ textDecoration: 'none', color: 'var(--ombre)' }}>Mon profil</Link>
              <form
                action={async () => {
                  'use server';
                  await signOut({ redirectTo: '/' });
                }}
              >
                <button type="submit" className="btn btn-ghost" style={{ padding: '9px 18px', fontSize: '0.85rem' }}>
                  Se déconnecter
                </button>
              </form>
            </>
          ) : (
            <Link href="/connexion" className="btn btn-primary" style={{ padding: '9px 20px 9px 26px', fontSize: '0.85rem' }}>
              Se connecter
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
