import { getLocale, getTranslations } from 'next-intl/server';
import { getActivePromotion, bonusAbonnementRestant } from '@/lib/promotions';
import { WELCOME_CREDITS } from '@/lib/pricing';
import { dateLocaleTag } from '@/i18n/dateLocale';
import { Link } from '@/i18n/navigation';

// Bandeau "promotion" en haut de la page d'accueil — remplace le détail de
// l'offre de bienvenue qui était noyé dans l'étape "01" du parcours (retour
// utilisateur : "mal mis en valeur"), n'apparaît que si une promotion est
// active (voir lib/promotions.ts). Réutilise les mêmes clés de traduction
// que le bloc équivalent sur /tarifs, pour ne pas dupliquer les textes —
// mais en version courte, une seule ligne (retour utilisateur : le détail
// complet en liste à puces était répété mot pour mot sur les deux pages).
// Le détail complet reste sur /tarifs, là où l'achat se fait ; ici, un
// simple rappel cliquable qui y renvoie.
export default async function PromoBanner() {
  const promo = await getActivePromotion().catch(() => null);
  if (!promo) return null;

  const locale = await getLocale();
  const t = await getTranslations('Pricing');
  const tHome = await getTranslations('Home');
  const placesRestantes =
    promo.bonusAbonnementMultiplicateur != null
      ? (await bonusAbonnementRestant(promo).catch(() => promo.bonusAbonnementQuota)) ?? 0
      : 0;
  const finLabel = promo.fin.toLocaleDateString(dateLocaleTag(locale), { day: 'numeric', month: 'long' });

  // Un seul rappel, pas la liste complète — même ordre de priorité que
  // l'affichage détaillé de /tarifs.
  const resume =
    promo.reductionPourcent != null
      ? t('promo10', { pourcent: promo.reductionPourcent, date: finLabel })
      : promo.bonusAbonnementMultiplicateur != null
      ? promo.bonusAbonnementQuota == null
        ? t('promoDoubleUnlimited', { multiplicateur: promo.bonusAbonnementMultiplicateur })
        : placesRestantes > 0
        ? t('promoDoubleWithSlots', { multiplicateur: promo.bonusAbonnementMultiplicateur, n: placesRestantes })
        : t('promoDoubleSoldOut')
      : promo.creditsBienvenue != null && promo.creditsBienvenueJours != null
      ? t('promoWelcomeCredits', { credits: promo.creditsBienvenue, defaut: WELCOME_CREDITS, jours: promo.creditsBienvenueJours })
      : null;
  if (!resume) return null;

  return (
    <div className="container" style={{ padding: '20px 24px 0' }}>
      <Link
        href="/tarifs"
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '14px 20px',
          borderColor: 'var(--lever)',
          background: 'var(--brume)',
          textDecoration: 'none',
          color: 'inherit',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="pill" style={{ borderColor: 'var(--lever)', color: 'var(--lever-profond)' }}>
            {promo.nom || t('launchOfferPill')}
          </span>
          <span style={{ fontSize: '0.88rem', color: 'var(--encre)' }}>{resume}</span>
        </span>
        <span style={{ fontSize: '0.82rem', color: 'var(--lever-profond)', fontWeight: 600, whiteSpace: 'nowrap' }}>
          {tHome('discoverPackages')} →
        </span>
      </Link>
    </div>
  );
}
