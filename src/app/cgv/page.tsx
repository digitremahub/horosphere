import { CREDIT_EXPIRY_DAYS } from '@/lib/pricing';

export const metadata = {
  title: 'Conditions générales de vente — Horosphère',
};

export default function CGVPage() {
  return (
    <main className="container-narrow" style={{ paddingTop: 56, paddingBottom: 96 }}>
      <div className="pill" style={{ marginBottom: 16 }}>Informations légales</div>
      <h1 style={{ fontSize: '2rem', marginBottom: 10 }}>Conditions générales de vente</h1>
      <p style={{ color: 'var(--ombre)', marginBottom: 18 }}>
        Les présentes conditions régissent les ventes de packs de crédits et d'abonnements réalisées sur
        Horosphère. En procédant à un achat, vous les acceptez sans réserve.
      </p>
      <div className="card" style={{ padding: '14px 18px', marginBottom: 36, borderColor: 'var(--ambre)', color: 'var(--ambre)', fontSize: '0.84rem' }}>
        Ce document est un projet rédigé à partir du fonctionnement réel du service. Il doit être relu par
        un professionnel du droit avant toute publication définitive.
      </div>

      <div className="card" style={{ padding: '26px 24px', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>1. Objet et nature du service</h2>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>
          Horosphère propose des lectures astrologiques générées à la demande (horoscopes, thèmes astraux,
          analyses de compatibilité, guidances thématiques, etc.), sous forme de contenu numérique fourni
          immédiatement après validation du paiement. Ces contenus sont proposés à titre de divertissement
          et de développement personnel ; ils ne remplacent aucun conseil professionnel.
        </p>
      </div>

      <div className="card" style={{ padding: '26px 24px', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>2. Packs de crédits</h2>
        <p style={{ margin: '0 0 10px', fontSize: '0.92rem' }}>
          Chaque pack correspond à un nombre fixe de crédits, débités au fur et à mesure des lectures
          générées, selon le coût affiché pour chaque type de lecture sur la page Tarifs.
        </p>
        <p style={{ margin: '0 0 10px', fontSize: '0.92rem' }}>
          Les crédits achetés sous forme de pack sont valables <strong>{CREDIT_EXPIRY_DAYS} jours</strong>{' '}
          à compter de la date d'achat. Passé ce délai, les crédits non utilisés sont perdus, sans
          remboursement.
        </p>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>
          Le paiement est réalisé en une fois, au moment de l'achat, via notre prestataire de paiement
          Stripe.
        </p>
      </div>

      <div className="card" style={{ padding: '26px 24px', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>3. Abonnements</h2>
        <p style={{ margin: '0 0 10px', fontSize: '0.92rem' }}>
          Les abonnements sont facturés mensuellement, par reconduction automatique, via Stripe. Chaque
          cycle recharge le nombre de crédits associé à la formule choisie ; les crédits d'abonnement non
          consommés à la fin d'un cycle ne sont pas reportés au cycle suivant.
        </p>
        <p style={{ margin: '0 0 10px', fontSize: '0.92rem' }}>
          Certaines lectures sont réservées aux abonnés actifs, quel que soit leur solde de crédits ; elles
          redeviennent inaccessibles si l'abonnement n'est plus actif.
        </p>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>
          Vous pouvez résilier votre abonnement à tout moment. La résiliation prend effet à la fin de la
          période déjà payée : l'accès aux avantages de l'abonnement (crédits du cycle en cours, lectures
          réservées aux abonnés) reste actif jusqu'à cette date, sans reconduction ni facturation
          ultérieure.
        </p>
      </div>

      <div className="card" style={{ padding: '26px 24px', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>4. Droit de rétractation</h2>
        <p style={{ margin: '0 0 10px', fontSize: '0.92rem' }}>
          Conformément à l'article L221-28 du Code de la consommation, le droit de rétractation ne peut pas
          être exercé pour les contenus numériques fournis sur un support immatériel dont l'exécution a
          commencé après accord préalable et exprès du consommateur, et renoncement exprès à son droit de
          rétractation.
        </p>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>
          En validant l'achat d'un pack de crédits ou d'un abonnement, et en générant une lecture
          immédiatement disponible, vous reconnaissez demander l'exécution immédiate du service et
          renoncez expressément à votre droit de rétractation de 14 jours pour le contenu ainsi consommé.
        </p>
      </div>

      <div className="card" style={{ padding: '26px 24px', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>5. Remboursements</h2>
        <p style={{ margin: '0 0 10px', fontSize: '0.92rem' }}>
          Compte tenu de la nature immédiate et numérique du service, les crédits déjà consommés (lectures
          déjà générées) ne sont pas remboursables.
        </p>
        <p style={{ margin: '0 0 10px', fontSize: '0.92rem' }}>
          En cas de défaut technique avéré empêchant la génération d'une lecture après débit de crédits
          (par exemple une erreur serveur), les crédits concernés sont recrédités automatiquement ou, à
          défaut, sur simple demande auprès du support.
        </p>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>
          Pour toute anomalie de facturation (double prélèvement, montant incorrect), un remboursement
          peut être demandé dans un délai de 14 jours suivant la transaction ; il sera étudié au cas par
          cas.
        </p>
      </div>

      <div className="card" style={{ padding: '26px 24px' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>6. Paiement</h2>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>
          Les paiements sont traités par Stripe. Horosphère ne stocke aucune donnée bancaire : les
          coordonnées de paiement sont saisies directement sur l'interface sécurisée de Stripe.
        </p>
      </div>
    </main>
  );
}
