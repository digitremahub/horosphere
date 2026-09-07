import { SOCIAL_LINKS } from '@/lib/socialLinks';

// Icônes minimalistes (traits, sans remplissage) pour rester cohérentes
// avec le reste de l'identité visuelle du site — pas de logo coloré importé.
function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M15 8.5h-2c-.8 0-1.5.7-1.5 1.5v2h3.4l-.5 3H11.5V21h-3v-6H6v-3h2.5v-2.3c0-2.4 1.6-4.2 4-4.2H15v2.5z" />
    </svg>
  );
}

const ICONS = { instagram: InstagramIcon, facebook: FacebookIcon } as const;

/** Icônes des réseaux sociaux réellement actifs — n'affiche que ceux
 * configurés dans lib/socialLinks.ts (jamais de lien mort pour un réseau
 * pas encore lancé, ex. TikTok). */
export default function SocialIcons({ label }: { label: string }) {
  const entries = (Object.entries(SOCIAL_LINKS) as [keyof typeof ICONS, string][]).filter(([, url]) => Boolean(url));
  if (entries.length === 0) return null;
  return (
    <span style={{ display: 'flex', gap: 14 }} aria-label={label}>
      {entries.map(([key, url]) => {
        const Icon = ICONS[key];
        return (
          <a key={key} href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', display: 'flex' }} aria-label={key}>
            <Icon />
          </a>
        );
      })}
    </span>
  );
}
