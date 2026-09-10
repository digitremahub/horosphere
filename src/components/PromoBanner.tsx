import { getLocale, getTranslations } from 'next-intl/server';
import { getActivePromotion, bonusAbonnementRestant } from '@/lib/promotions';
import { WELCOME_CREDITS } from '@/lib/pricing';
import { dateLocaleTag } from '@/i18n/dateLocale';

// Bandeau "promotion" en haut de la page d'accueil — remplace le détail de
// l'offre de bienvenue qui était noyé dans l'étape "01" du parcours (retour
// utilisateur : "mal mis en valeur"), n'apparaît que si une promotion est
// active (voir lib/promotions.ts). Réutilise les mêmes clés de traduction
// que le bandeau équivalent sur /tarifs, pour ne pas dupliquer les textes.
export default async function PromoBanner() {
  const promo = await getActivePromotion().catch(() => null);
  if (!promo) return null;

  const locale = await getLocale();
  const t = await getTranslations('Pricing');
  const placesRestantes =
    promo.bonusAbonnementMultiplicateur != null
      ? (await bonusAbonnementRestant(promo).catch(() => promo.bonusAbonnementQuota)) ?? 0
      : 0;
  const finLabel = promo.fin.toLocaleDateString(dateLocaleTag(locale), { day: 'numeric', month: 'long' });

  return (
    <div className="container" style={{ padding: '20px 24px 0' }}>
      <div className="card" style={{ padding: '18px 22px', borderColor: 'var(--lever)', background: 'var(--brume)' }}>
        <div className="pill" style={{ marginBottom: 10, borderColor: 'var(--lever)', color: 'var(--lever-profond)' }}>
          {promo.nom || t('launchOfferPill')}
        </div>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.88rem', color: 'var(--encre)' }}>
          {promo.reductionPourcent != null && <li>{t('promo10', { pourcent: promo.reductionPourcent, date: finLabel })}</li>}
          {promo.bonusAbonnementMultiplicateur != null && (
            <li>
              {promo.bonusAbonnementQuota == null
                ? t('promoDoubleUnlimited', { multiplicateur: promo.bonusAbonnementMultiplicateur })
                : placesRestantes > 0
                ? t('promoDoubleWithSlots', { multiplicateur: promo.bonusAbonnementMultiplicateur, n: placesRestantes })
                : t('promoDoubleSoldOut')}
            </li>
          )}
          {promo.creditsBienvenue != null && promo.creditsBienvenueJours != null && (
            <li>{t('promoWelcomeCredits', { credits: promo.creditsBienvenue, defaut: WELCOME_CREDITS, jours: promo.creditsBienvenueJours })}</li>
          )}
        </ul>
      </div>
    </div>
  );
}
