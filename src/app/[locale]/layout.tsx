import type { Metadata } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import '../globals.css';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import SiteHeader from '@/components/SiteHeader';
import ScrollToTopButton from '@/components/ScrollToTopButton';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return { title: t('title'), description: t('description') };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  // Requis par next-intl côté Server Components : fige la langue de cette
  // requête avant que quoi que ce soit d'autre ne s'exécute.
  setRequestLocale(locale);
  const t = await getTranslations('Footer');

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          <SiteHeader />
          {children}
          <footer style={{ borderTop: '1px solid var(--trait)', marginTop: 80, padding: '32px 0', color: 'var(--sourdine)', fontSize: '0.82rem' }}>
            <div className="container" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <span>© {new Date().getFullYear()} Horosphère</span>
              <span>{t('tagline')}</span>
              <span style={{ display: 'flex', gap: 18 }}>
                <Link href="/mentions-legales" style={{ color: 'var(--sourdine)' }}>{t('legalNotice')}</Link>
                <Link href="/cgv" style={{ color: 'var(--sourdine)' }}>{t('terms')}</Link>
                <Link href="/politique-de-confidentialite" style={{ color: 'var(--sourdine)' }}>{t('privacy')}</Link>
              </span>
            </div>
          </footer>
          <ScrollToTopButton />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
