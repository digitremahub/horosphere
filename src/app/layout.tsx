import type { Metadata } from 'next';
import './globals.css';
import SiteHeader from '@/components/SiteHeader';

export const metadata: Metadata = {
  title: 'Horosphère — votre rituel du jour',
  description: "Horoscope quotidien personnalisé par IA. Un moment de calme et de clarté, chaque jour.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <SiteHeader />
        {children}
        <footer style={{ borderTop: '1px solid var(--trait)', marginTop: 80, padding: '32px 0', color: 'var(--sourdine)', fontSize: '0.82rem' }}>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span>© {new Date().getFullYear()} Horosphère</span>
            <span>Un rituel quotidien, pensé pour durer.</span>
            <span style={{ display: 'flex', gap: 18 }}>
              <a href="/mentions-legales" style={{ color: 'var(--sourdine)' }}>Mentions légales</a>
              <a href="/cgv" style={{ color: 'var(--sourdine)' }}>CGV</a>
              <a href="/politique-de-confidentialite" style={{ color: 'var(--sourdine)' }}>Confidentialité</a>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
