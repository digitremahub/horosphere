import { getLocale, getTranslations } from 'next-intl/server';
import { auth, signOut } from '@/lib/auth';
import { Link, getPathname } from '@/i18n/navigation';
import Logo from './Logo';
import MoonPhase from './MoonPhase';
import LanguageSwitcher from './LanguageSwitcher';

export default async function SiteHeader() {
  const session = await auth();
  const t = await getTranslations('Nav');
  const locale = await getLocale();
  const homePath = getPathname({ href: '/', locale });

  return (
    <header style={{ borderBottom: '1px solid var(--trait)' }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 10, minHeight: 72, padding: '14px 24px' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <Logo />
          <span className="display" style={{ fontSize: '1.25rem', fontStyle: 'italic', color: 'var(--encre)' }}>Horosphère</span>
          <MoonPhase size={18} />
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '0.92rem', flexWrap: 'wrap' }}>
          <Link href="/" style={{ textDecoration: 'none', color: 'var(--ombre)' }}>{t('home')}</Link>
          <Link href="/actualites" style={{ textDecoration: 'none', color: 'var(--ombre)' }}>{t('news')}</Link>
          <Link href="/tarifs" style={{ textDecoration: 'none', color: 'var(--ombre)' }}>{t('pricing')}</Link>
          {session?.user ? (
            <>
              <Link href="/app" style={{ textDecoration: 'none', color: 'var(--ombre)' }}>{t('mySpace')}</Link>
              <Link href="/app/historique" style={{ textDecoration: 'none', color: 'var(--ombre)' }}>{t('history')}</Link>
              <Link href="/app/profil" style={{ textDecoration: 'none', color: 'var(--ombre)' }}>{t('profile')}</Link>
              <form
                action={async () => {
                  'use server';
                  await signOut({ redirectTo: homePath });
                }}
              >
                <button type="submit" className="btn btn-ghost" style={{ padding: '9px 18px', fontSize: '0.85rem' }}>
                  {t('logout')}
                </button>
              </form>
            </>
          ) : (
            <Link href="/connexion" className="btn btn-primary" style={{ padding: '9px 20px 9px 26px', fontSize: '0.85rem' }}>
              {t('login')}
            </Link>
          )}
          <LanguageSwitcher />
        </nav>
      </div>
    </header>
  );
}
