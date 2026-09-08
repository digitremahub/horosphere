import { getLocale, getTranslations } from 'next-intl/server';
import { redirect, Link } from '@/i18n/navigation';
import { auth } from '@/lib/auth';
import { dbConfigured } from '@/lib/db';
import AdventCalendar from '@/components/AdventCalendar';

export default async function CalendrierAventPage() {
  const session = await auth();
  const locale = await getLocale();
  const t = await getTranslations('Advent');
  if (!session?.user) {
    redirect({ href: '/connexion', locale });
  }

  return (
    <main style={{ paddingBottom: 96 }}>
      <div className="container" style={{ maxWidth: 900, paddingTop: 40 }}>
        <Link href="/app" style={{ fontSize: '0.85rem', color: 'var(--sourdine)', textDecoration: 'none' }}>
          {t('backToSpace')}
        </Link>
        <h1 style={{ fontSize: '1.8rem', marginTop: 14 }}>{t('title')}</h1>
        <p style={{ color: 'var(--ombre)', marginBottom: 32 }}>{t('subtitle')}</p>

        {dbConfigured ? <AdventCalendar /> : <p style={{ color: 'var(--sourdine)' }}>{t('dbNotConnected')}</p>}
      </div>
    </main>
  );
}
