import { SOCIAL_LINKS } from '@/lib/socialLinks';

// Icônes minimalistes (traits, sans remplissage) pour rester cohérentes
// avec le reste de l'identité visuelle du site — pas de logo coloré importé.
function InstagramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M15 8.5h-2c-.8 0-1.5.7-1.5 1.5v2h3.4l-.5 3H11.5V21h-3v-6H6v-3h2.5v-2.3c0-2.4 1.6-4.2 4-4.2H15v2.5z" />
    </svg>
  );
}

const ICONS = { instagram: InstagramIcon, facebook: FacebookIcon } as const;

/** Boutons flottants vers les réseaux sociaux réellement actifs — même
 * style que ScrollToTopButton (cercle, fond nacre, ombre), empilés en bas à
 * GAUCHE pour ne jamais chevaucher le bouton "remonter en haut" (bas à
 * droite). N'affiche que les réseaux configurés dans lib/socialLinks.ts
 * (jamais de bouton vers un compte pas encore lancé, ex. TikTok).
 *
 * Étant fixés à l'écran, ils recouvrent inévitablement UN contenu de page
 * différent selon la position de défilement (signalé plusieurs fois par
 * capture d'écran, notamment en mobile où le texte occupe toute la
 * largeur) — atténué en réduisant leur taille et en les rendant semi-
 * transparents par défaut (pleinement visibles au survol/tap, via
 * .social-icon-float dans globals.css), plutôt qu'en les retirant. */
export default function SocialIcons() {
  const entries = (Object.entries(SOCIAL_LINKS) as [keyof typeof ICONS, string][]).filter(([, url]) => Boolean(url));
  if (entries.length === 0) return null;
  return (
    <div style={{ position: 'fixed', bottom: 16, left: 16, zIndex: 50, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {entries.map(([key, url]) => {
        const Icon = ICONS[key];
        return (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={key}
            className="social-icon-float"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: '1px solid var(--trait)',
              background: 'var(--nacre)',
              boxShadow: 'var(--shadow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ombre)',
            }}
          >
            <Icon />
          </a>
        );
      })}
    </div>
  );
}
