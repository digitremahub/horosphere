'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { SIGNS, signFromBirthdate } from '@/lib/zodiac';
import { localizedSign } from '@/lib/zodiac-i18n';
import { fallbackHoroscope } from '@/lib/fallback-generator';
import { Link } from '@/i18n/navigation';
import BrandMark from '@/components/BrandMark';
import { SignCircle } from '@/components/CardParts';

// Retour d'audit : l'aperçu gratuit montrait un simple sélecteur de signe,
// alors que tout l'argumentaire du site vend une personnalisation par
// thème natal réel (date + heure + lieu de naissance) — décalage entre
// la promesse et la démonstration. Ici, la personne tape sa VRAIE date de
// naissance (le signe en est déduit, pas choisi manuellement) ; un texte
// explicite clarifie ensuite que l'inscription va plus loin (heure +
// lieu, ascendant, lune natale) plutôt que de laisser croire que cet
// aperçu est déjà la version complète.
export default function FreeTeaser({
  ctaHref = '/connexion',
  ctaLabel,
}: {
  // Résolus côté serveur par la page d'accueil selon l'état de connexion —
  // ne jamais renvoyer quelqu'un de déjà connecté vers /connexion.
  ctaHref?: string;
  ctaLabel?: string;
}) {
  const locale = useLocale() as 'fr' | 'en' | 'es';
  const t = useTranslations('Home');
  const tCta = useTranslations('Cta');
  const [dateNaissance, setDateNaissance] = useState('');
  const signKey = useMemo(() => {
    if (!dateNaissance) return 'belier';
    const [, m, d] = dateNaissance.split('-').map(Number);
    return signFromBirthdate(m, d).key;
  }, [dateNaissance]);
  const sign = localizedSign(SIGNS.find((s) => s.key === signKey)!, locale);
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const reading = useMemo(() => fallbackHoroscope(signKey, todayISO, locale), [signKey, todayISO, locale]);

  return (
    <div className="card" style={{ padding: '28px 26px', maxWidth: 480, width: '100%', minWidth: 0, boxSizing: 'border-box', overflow: 'visible' }}>
      <div
        style={{ position: 'absolute', top: -14, right: -14, pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <BrandMark size={72} />
      </div>

      <div className="pill" style={{ marginBottom: 16 }}>{t('freePreviewPill')}</div>

      <div style={{ marginBottom: 18 }}>
        <label htmlFor="teaser-date-naissance" className="field-label">{t('freeBirthdateLabel')}</label>
        <input
          id="teaser-date-naissance"
          type="date"
          value={dateNaissance}
          max={todayISO}
          placeholder={t('freeBirthdatePlaceholder')}
          onChange={(e) => setDateNaissance(e.target.value)}
          style={{
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid var(--trait)',
            background: 'var(--nacre)',
            color: 'var(--encre)',
            fontSize: '0.9rem',
            width: '100%',
          }}
        />
      </div>

      <div key={signKey} className="fade-swap">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <SignCircle symbole={sign.symbole} size={46} />
          <div>
            <div style={{ fontWeight: 700 }}>{sign.nom}</div>
            <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--sourdine)' }}>{sign.dates}</div>
          </div>
        </div>

        <p className="display" style={{ fontStyle: 'italic', fontSize: '1.15rem', marginBottom: 14 }}>{reading.headline}</p>
        <p style={{ color: 'var(--ombre)', fontSize: '0.95rem', marginBottom: 14 }}>{reading.amour}</p>
      </div>

      <p style={{ fontSize: '0.76rem', color: 'var(--sourdine)', marginBottom: 20 }}>
        {t('freeRealPersonalization')}
      </p>

      <Link href={ctaHref} className="btn btn-primary" style={{ width: '100%' }}>
        {ctaLabel ?? tCta('startFreeTeaser')}
      </Link>
      {ctaHref === '/connexion' && (
        <p style={{ fontSize: '0.76rem', color: 'var(--sourdine)', textAlign: 'center', marginTop: 10 }}>
          {t('freeAtLogin')}
        </p>
      )}
    </div>
  );
}
