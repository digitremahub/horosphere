import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import '../globals.css';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import SiteHeader from '@/components/SiteHeader';
import ScrollToTopButton from '@/components/ScrollToTopButton';
import SocialIcons from '@/components/SocialIcons';
import PwaRegister from '@/components/PwaRegister';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return {
    title: t('title'),
    description: t('description'),
    // "Ajouter à l'écran d'accueil" sur iOS (Safari ignore manifest.ts pour
    // le nom/la barre de statut, ces balises sont nécessaires en plus).
    appleWebApp: { title: 'Horosphère', statusBarStyle: 'default' },
  };
}

// Couleur de la barre d'adresse mobile / de la fenêtre PWA — même logique
// clair/sombre que globals.css (--aube, --lever-profond).
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#A64E36' },
    { media: '(prefers-color-scheme: dark)', color: '#241925' },
  ],
};

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
          <div className="page-bandeau-bas">
            <img src="/images/bandeau-bas.png" alt="" loading="lazy" />
          </div>
          <footer style={{ borderTop: '1px solid var(--trait)', marginTop: 80, padding: '32px 0', color: 'var(--sourdine)', fontSize: '0.82rem' }}>
            <div className="container" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <span>© {new Date().getFullYear()} Horosphère</span>
              <span>{t('tagline')}</span>
              <span style={{ display: 'flex', gap: 18 }}>
                <Link href="/faq" style={{ color: 'var(--sourdine)' }}>{t('faq')}</Link>
                <Link href="/mentions-legales" style={{ color: 'var(--sourdine)' }}>{t('legalNotice')}</Link>
                <Link href="/cgv" style={{ color: 'var(--sourdine)' }}>{t('terms')}</Link>
                <Link href="/politique-de-confidentialite" style={{ color: 'var(--sourdine)' }}>{t('privacy')}</Link>
              </span>
            </div>
          </footer>
          <SocialIcons />
          <ScrollToTopButton />
          <PwaRegister />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
