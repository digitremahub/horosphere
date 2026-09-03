export const metadata = {
  title: 'Mentions légales — Horosphère',
};

// Certaines informations d'identité de l'éditeur ne peuvent pas être
// devinées ni inventées : elles sont marquées [À COMPLÉTER] en attendant
// que l'éditeur du site les renseigne. Ne jamais remplacer ces champs par
// des valeurs plausibles mais non vérifiées.
function ACompleter({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ background: 'var(--brume)', border: '1px dashed var(--ambre)', borderRadius: 6, padding: '1px 8px', color: 'var(--ambre)', fontWeight: 600 }}>
      [À COMPLÉTER — {children}]
    </span>
  );
}

export default function MentionsLegalesPage() {
  return (
    <main className="container-narrow" style={{ paddingTop: 56, paddingBottom: 96 }}>
      <div className="pill" style={{ marginBottom: 16 }}>Informations légales</div>
      <h1 style={{ fontSize: '2rem', marginBottom: 10 }}>Mentions légales</h1>
      <p style={{ color: 'var(--ombre)', marginBottom: 36 }}>
        Conformément aux articles 6-III et 19 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans
        l'économie numérique, il est précisé aux utilisateurs du site Horosphère l'identité des différents
        intervenants dans le cadre de sa réalisation et de son suivi.
      </p>

      <div className="card" style={{ padding: '26px 24px', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>Éditeur du site</h2>
        <p style={{ margin: '0 0 8px', fontSize: '0.92rem' }}>
          Nom / raison sociale : <ACompleter>nom de l'éditeur ou de la société</ACompleter>
        </p>
        <p style={{ margin: '0 0 8px', fontSize: '0.92rem' }}>
          Forme juridique : <ACompleter>ex. entreprise individuelle, SASU, SARL…</ACompleter>
        </p>
        <p style={{ margin: '0 0 8px', fontSize: '0.92rem' }}>
          Siège social / adresse : <ACompleter>adresse postale</ACompleter>
        </p>
        <p style={{ margin: '0 0 8px', fontSize: '0.92rem' }}>
          SIRET / RCS : <ACompleter>numéro d'immatriculation, si applicable</ACompleter>
        </p>
        <p style={{ margin: '0 0 8px', fontSize: '0.92rem' }}>
          Directeur de la publication : <ACompleter>nom du responsable de la publication</ACompleter>
        </p>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>
          Contact : <ACompleter>adresse e-mail de contact</ACompleter>
        </p>
      </div>

      <div className="card" style={{ padding: '26px 24px', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>Hébergement</h2>
        <p style={{ margin: '0 0 8px', fontSize: '0.92rem' }}>
          Le site Horosphère est hébergé par :
        </p>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>
          Vercel Inc. — 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis —{' '}
          <a href="https://vercel.com" style={{ color: 'var(--lever-profond)' }}>vercel.com</a>
        </p>
      </div>

      <div className="card" style={{ padding: '26px 24px', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>Propriété intellectuelle</h2>
        <p style={{ margin: '0 0 12px', fontSize: '0.92rem' }}>
          L'ensemble des éléments du site Horosphère (textes, illustrations, logo, mise en page, code) est,
          sauf mention contraire, la propriété de l'éditeur du site. Toute reproduction, représentation,
          modification ou adaptation totale ou partielle, sans autorisation préalable, est interdite.
        </p>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>
          Les lectures et contenus générés par intelligence artificielle sont fournis à titre de
          divertissement et de développement personnel. Ils ne constituent en aucun cas un avis médical,
          juridique, financier ou psychologique, et ne sauraient engager la responsabilité de l'éditeur
          quant aux décisions prises sur leur seul fondement.
        </p>
      </div>

      <div className="card" style={{ padding: '26px 24px' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>Données personnelles</h2>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>
          Le traitement des données personnelles collectées via Horosphère (adresse e-mail, date, heure et
          lieu de naissance, historique des lectures) est nécessaire à la fourniture du service. Pour toute
          question relative à vos données ou pour exercer vos droits d'accès, de rectification ou de
          suppression, contactez <ACompleter>adresse e-mail de contact</ACompleter>.
        </p>
      </div>
    </main>
  );
}
