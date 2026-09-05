import { CREDIT_EXPIRY_DAYS } from '@/lib/pricing';
import { Link } from '@/i18n/navigation';

export const metadata = {
  title: 'Politique de confidentialité — Horosphère',
};

// Un seul point n'est pas vérifiable depuis le code : la région
// d'hébergement exacte de la base Neon (dépend de la configuration du
// projet, pas du code source) — jamais inventée, voir mentions-legales
// pour la même convention sur les champs d'identité.
function AVerifier({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ background: 'var(--brume)', border: '1px dashed var(--ambre)', borderRadius: 6, padding: '1px 8px', color: 'var(--ambre)', fontWeight: 600 }}>
      [À VÉRIFIER — {children}]
    </span>
  );
}

export default function PolitiqueConfidentialitePage() {
  return (
    <main className="container-narrow" style={{ paddingTop: 56, paddingBottom: 96 }}>
      <div className="pill" style={{ marginBottom: 16 }}>Informations légales</div>
      <h1 style={{ fontSize: '2rem', marginBottom: 10 }}>Politique de confidentialité</h1>
      <p style={{ color: 'var(--ombre)', marginBottom: 18 }}>
        Cette page décrit quelles données Horosphère collecte, pourquoi, combien de temps, avec qui elles
        sont partagées, et comment faire valoir vos droits — conformément au Règlement général sur la
        protection des données (RGPD).
      </p>

      <div className="card" style={{ padding: '26px 24px', marginBottom: 24, marginTop: 36 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>1. Qui traite vos données</h2>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>
          L'éditeur du site Horosphère (voir les <Link href="/mentions-legales" style={{ color: 'var(--lever-profond)' }}>mentions légales</Link>)
          est responsable du traitement de vos données personnelles. Au vu de la nature et du volume des
          données traitées, la désignation d'un délégué à la protection des données (DPO) n'est pas
          obligatoire ; toute question relative à vos données peut être adressée à{' '}
          <a href="mailto:contact@horosphere.fr" style={{ color: 'var(--lever-profond)' }}>contact@horosphere.fr</a>.
        </p>
      </div>

      <div className="card" style={{ padding: '26px 24px', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>2. Données collectées et pourquoi</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <strong style={{ fontSize: '0.92rem' }}>Compte</strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.92rem', color: 'var(--ombre)' }}>
              Adresse e-mail (obligatoire), nom (optionnel), mot de passe si vous choisissez d'en définir
              un — jamais stocké en clair, uniquement sous forme hachée (voir section 6). Nécessaire pour
              créer votre compte et vous permettre de vous connecter.
            </p>
          </div>
          <div>
            <strong style={{ fontSize: '0.92rem' }}>Profil de naissance</strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.92rem', color: 'var(--ombre)' }}>
              Prénom, nom, date de naissance, heure de naissance (optionnelle), lieu de naissance, téléphone
              (optionnel). Nécessaire pour calculer votre signe, votre thème astral et générer vos lectures
              personnalisées — c'est la raison d'être du service.
            </p>
          </div>
          <div>
            <strong style={{ fontSize: '0.92rem' }}>Historique des lectures</strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.92rem', color: 'var(--ombre)' }}>
              Le contenu des lectures générées, la date et le nombre de crédits dépensés, pour vous permettre
              de les retrouver dans votre espace.
            </p>
          </div>
          <div>
            <strong style={{ fontSize: '0.92rem' }}>Paiement</strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.92rem', color: 'var(--ombre)' }}>
              Géré entièrement par notre prestataire de paiement Stripe : nous ne recevons ni ne stockons
              jamais vos coordonnées bancaires. Nous conservons uniquement l'identifiant client Stripe et le
              statut de votre abonnement, pour synchroniser vos crédits et l'accès aux fonctionnalités.
            </p>
          </div>
          <div>
            <strong style={{ fontSize: '0.92rem' }}>Newsletter</strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.92rem', color: 'var(--ombre)' }}>
              Case pré-cochée à la création du profil (désactivable à tout moment depuis votre profil, ou en
              un clic depuis chaque e-mail reçu). Utilisée uniquement pour vous envoyer l'actualité du ciel
              publiée sur Horosphère, au maximum une fois par semaine.
            </p>
          </div>
          <div>
            <strong style={{ fontSize: '0.92rem' }}>Cookie de connexion</strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.92rem', color: 'var(--ombre)' }}>
              Un seul cookie, strictement nécessaire pour vous garder connecté — aucun cookie de mesure
              d'audience, de publicité ou de traçage tiers n'est déposé sur Horosphère. Ce cookie étant
              indispensable au fonctionnement du service, son dépôt ne nécessite pas de bandeau de
              consentement (recommandation CNIL).
            </p>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '26px 24px', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>3. Base légale</h2>
        <p style={{ margin: '0 0 10px', fontSize: '0.92rem' }}>
          Le compte, le profil de naissance, l'historique et le paiement sont traités pour l'exécution du
          contrat qui vous lie à Horosphère au moment de la création de votre compte (article 6.1.b du
          RGPD) : sans ces informations, le service ne peut pas fonctionner.
        </p>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>
          La newsletter repose sur votre qualité de client existant pour un contenu similaire à notre
          service (exception dite de « soft opt-in ») ; vous pouvez vous y opposer à tout moment sans que
          cela n'affecte votre accès au reste du service.
        </p>
      </div>

      <div className="card" style={{ padding: '26px 24px', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>4. Avec qui vos données sont partagées</h2>
        <p style={{ margin: '0 0 10px', fontSize: '0.92rem' }}>
          Vos données ne sont ni vendues ni louées. Elles sont partagées uniquement avec les prestataires
          techniques nécessaires au fonctionnement d'Horosphère, chacun agissant comme sous-traitant au sens
          du RGPD :
        </p>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.92rem', color: 'var(--ombre)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li><strong>Vercel</strong> (hébergement du site et exécution du code) — États-Unis.</li>
          <li><strong>Neon</strong> (base de données) — région d'hébergement : <AVerifier>vérifier la région configurée sur le projet Vercel Storage</AVerifier>.</li>
          <li><strong>Stripe</strong> (paiement) — États-Unis, entité européenne disponible.</li>
          <li><strong>Resend</strong> (envoi du lien de connexion et de la newsletter) — États-Unis.</li>
          <li><strong>Anthropic</strong> (génération des lectures par intelligence artificielle — votre date de naissance et votre prénom sont transmis au moment de la génération, jamais stockés par ce prestataire au-delà du traitement de la requête) — États-Unis.</li>
        </ul>
        <p style={{ margin: '10px 0 0', fontSize: '0.92rem' }}>
          Certains de ces prestataires peuvent traiter des données hors de l'Union européenne. Ils
          s'appuient dans ce cas sur les clauses contractuelles types de la Commission européenne ou un
          mécanisme de transfert équivalent.
        </p>
      </div>

      <div className="card" style={{ padding: '26px 24px', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>5. Durée de conservation</h2>
        <p style={{ margin: '0 0 10px', fontSize: '0.92rem' }}>
          Les données de votre compte, votre profil et votre historique sont conservées tant que votre
          compte est actif. Les packs de crédits achetés expirent après {CREDIT_EXPIRY_DAYS} jours (voir les{' '}
          <Link href="/cgv" style={{ color: 'var(--lever-profond)' }}>CGV</Link>), sans que cela n'entraîne la
          suppression de votre compte.
        </p>
        <p style={{ margin: '0 0 10px', fontSize: '0.92rem' }}>
          Les documents liés à la facturation sont conservés 10 ans, conformément à l'obligation légale de
          conservation des documents comptables.
        </p>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>
          Si vous demandez la suppression de votre compte, vos données sont effacées dans un délai maximal
          d'un mois (délai légal de réponse aux demandes RGPD), sous réserve des obligations de conservation
          légales mentionnées ci-dessus.
        </p>
      </div>

      <div className="card" style={{ padding: '26px 24px', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>6. Sécurité</h2>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.92rem', color: 'var(--ombre)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>Connexion chiffrée (HTTPS) sur l'ensemble du site.</li>
          <li>Mots de passe hachés (bcrypt) — jamais stockés ni consultables en clair, y compris par l'équipe Horosphère.</li>
          <li>Cookie de session marqué httpOnly, inaccessible au code exécuté dans votre navigateur.</li>
          <li>Aucune donnée bancaire ne transite ni n'est stockée par Horosphère — cette étape est intégralement déléguée à Stripe.</li>
          <li>Accès à la base de données restreint aux seuls services d'Horosphère, via une connexion privée non exposée publiquement.</li>
        </ul>
      </div>

      <div className="card" style={{ padding: '26px 24px' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>7. Vos droits</h2>
        <p style={{ margin: '0 0 10px', fontSize: '0.92rem' }}>
          Conformément aux articles 15 à 21 du RGPD, vous disposez d'un droit d'accès, de rectification,
          d'effacement, de limitation, d'opposition et de portabilité sur vos données. Vous pouvez modifier
          votre profil et vos préférences de newsletter directement depuis <Link href="/app/profil" style={{ color: 'var(--lever-profond)' }}>votre espace</Link>{' '},
          ou exercer l'un de ces droits — y compris la suppression complète de votre compte — en écrivant à{' '}
          <a href="mailto:contact@horosphere.fr" style={{ color: 'var(--lever-profond)' }}>contact@horosphere.fr</a>.
        </p>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>
          Vous disposez également du droit d'introduire une réclamation auprès de la CNIL —{' '}
          <a href="https://www.cnil.fr/fr/agir" target="_blank" rel="noreferrer" style={{ color: 'var(--lever-profond)' }}>cnil.fr/fr/agir</a>{' '}
          — si vous estimez que le traitement de vos données n'est pas conforme à la réglementation.
        </p>
      </div>
    </main>
  );
}
