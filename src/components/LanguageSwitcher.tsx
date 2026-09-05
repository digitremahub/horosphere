'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

const NOMS: Record<string, string> = { fr: 'FR', en: 'EN' };

// Bascule la langue sans changer de page (le chemin est repris tel quel,
// juste reconstruit sous l'autre préfixe — /tarifs <-> /en/tarifs).
export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('LanguageSwitcher');

  return (
    <div aria-label={t('label')} style={{ display: 'flex', gap: 4, fontSize: '0.78rem' }}>
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => router.replace(pathname, { locale: l })}
          aria-pressed={l === locale}
          style={{
            padding: '4px 8px',
            borderRadius: 8,
            border: `1px solid ${l === locale ? 'var(--lever)' : 'var(--trait)'}`,
            background: l === locale ? 'var(--brume)' : 'transparent',
            color: l === locale ? 'var(--lever-profond)' : 'var(--sourdine)',
            cursor: l === locale ? 'default' : 'pointer',
            fontWeight: l === locale ? 700 : 400,
          }}
        >
          {NOMS[l] ?? l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
