// Backoffice minimal (utilisateurs, abonnements, config vidéos) — accès
// restreint à une liste blanche d'e-mails (voir lib/adminAuth.ts). Page
// volontairement non traduite (français en dur) : outil interne réservé à
// l'équipe Horosphère, jamais montré à un visiteur ou un client — inutile
// d'alourdir messages/*.json pour les trois langues du site pour ça.

import { redirect, Link } from '@/i18n/navigation';
import { getLocale } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { isAdminEmail } from '@/lib/adminAuth';
import { dbConfigured } from '@/lib/db';
import { listUsersAdmin, getAdminStats } from '@/lib/admin';
import { getSiteConfig, setSiteConfig, CLES_VIDEO } from '@/lib/siteConfig';
import { rembourserAnniversairesDuMois } from '@/lib/birthdayRefund';
import { SUBSCRIPTIONS } from '@/lib/pricing';

const inputStyle: React.CSSProperties = {
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid var(--trait)',
  background: 'var(--nacre)',
  color: 'var(--encre)',
  fontSize: '0.86rem',
  width: '100%',
};

const PLAN_NOMS: Record<string, string> = Object.fromEntries(SUBSCRIPTIONS.map((s) => [s.slug, s.nom]));

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const session = await auth();
  const locale = await getLocale();
  if (!session?.user) redirect({ href: '/connexion', locale });
  const email = (session!.user as { email?: string | null }).email;
  if (!isAdminEmail(email)) redirect({ href: '/app', locale });

  const { ok } = await searchParams;

  async function enregistrerVideos(formData: FormData) {
    'use server';
    const session = await auth();
    const email = (session?.user as { email?: string | null } | undefined)?.email;
    if (!isAdminEmail(email)) return;
    for (const cle of Object.values(CLES_VIDEO)) {
      const valeur = String(formData.get(cle) || '').trim();
      if (valeur) await setSiteConfig(cle, valeur);
    }
    redirect({ href: { pathname: '/app/admin', query: { ok: 'videos' } }, locale });
  }

  async function lancerRemboursementsAnniversaire() {
    'use server';
    const session = await auth();
    const email = (session?.user as { email?: string | null } | undefined)?.email;
    if (!isAdminEmail(email)) return;
    const resultat = await rembourserAnniversairesDuMois();
    redirect({
      href: { pathname: '/app/admin', query: { ok: `remb:${resultat.traites}:${resultat.rembourses}:${resultat.erreurs}` } },
      locale,
    });
  }

  let stats: Awaited<ReturnType<typeof getAdminStats>> | null = null;
  let users: Awaited<ReturnType<typeof listUsersAdmin>> = [];
  let videos: Record<string, string> = {};
  let loadError: string | null = null;

  if (dbConfigured) {
    try {
      [stats, users] = await Promise.all([getAdminStats(), listUsersAdmin(200)]);
      const paires = await Promise.all(Object.values(CLES_VIDEO).map(async (cle) => [cle, (await getSiteConfig(cle)) || ''] as const));
      videos = Object.fromEntries(paires);
    } catch (err) {
      loadError = 'Impossible de charger les données du backoffice pour le moment.';
      console.error('admin page load failed', err);
    }
  } else {
    loadError = "La base de données n'est pas connectée.";
  }

  return (
    <main style={{ paddingBottom: 96, paddingTop: 40 }}>
      <div className="container-narrow" style={{ maxWidth: 920 }}>
        <div style={{ marginBottom: 24 }}>
          <Link href="/app" style={{ fontSize: '0.82rem', color: 'var(--ombre)', textDecoration: 'none' }}>
            ← Mon espace
          </Link>
          <h1 style={{ fontSize: '1.5rem', marginTop: 10 }}>Backoffice</h1>
          <p style={{ color: 'var(--ombre)', fontSize: '0.88rem' }}>Vue rapide des utilisateurs et abonnements, config du site.</p>
        </div>

        {ok === 'videos' && (
          <div className="card" style={{ padding: '12px 16px', marginBottom: 20, fontSize: '0.84rem', color: 'var(--lever-profond)' }}>
            URLs vidéo enregistrées.
          </div>
        )}
        {ok?.startsWith('remb:') && (() => {
          const [, traites, rembourses, erreurs] = ok.split(':');
          return (
            <div className="card" style={{ padding: '12px 16px', marginBottom: 20, fontSize: '0.84rem', color: 'var(--lever-profond)' }}>
              Remboursements anniversaire : {traites} éligible(s) ce mois-ci, {rembourses} remboursé(s), {erreurs} erreur(s).
            </div>
          );
        })()}

        {loadError && (
          <div className="card" style={{ padding: '14px 18px', marginBottom: 20, borderColor: 'var(--lever)', color: 'var(--lever-profond)', fontSize: '0.86rem' }}>
            {loadError}
          </div>
        )}

        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
            <div className="card" style={{ padding: '16px 18px', boxShadow: 'none' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--sourdine)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Utilisateurs</div>
              <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 600 }}>{stats.totalUsers}</div>
            </div>
            <div className="card" style={{ padding: '16px 18px', boxShadow: 'none' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--sourdine)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Abonnés actifs</div>
              <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 600 }}>{stats.activeSubscriptions}</div>
            </div>
            {stats.subscriptionsByPlan.map((p) => (
              <div key={p.plan_slug} className="card" style={{ padding: '16px 18px', boxShadow: 'none' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--sourdine)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{PLAN_NOMS[p.plan_slug] ?? p.plan_slug}</div>
                <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 600 }}>{p.count}</div>
              </div>
            ))}
          </div>
        )}

        <div className="card" style={{ padding: '20px 22px', marginBottom: 28 }}>
          <h2 style={{ fontSize: '1rem', marginBottom: 4 }}>Actions rapides</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--sourdine)', marginBottom: 14 }}>
            La gestion fine d'un abonnement (annulation, remboursement ponctuel, moyen de paiement) reste dans le Dashboard Stripe — le lien direct vers le bon client est dans le tableau ci-dessous.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href="https://dashboard.stripe.com/customers" target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: '0.82rem' }}>
              Ouvrir Stripe →
            </a>
            <form action={lancerRemboursementsAnniversaire}>
              <button type="submit" className="btn btn-ghost" style={{ fontSize: '0.82rem' }}>
                Lancer les remboursements d'anniversaire du mois
              </button>
            </form>
          </div>
        </div>

        <div className="card" style={{ padding: '20px 22px', marginBottom: 28 }}>
          <h2 style={{ fontSize: '1rem', marginBottom: 4 }}>Vidéos du site</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--sourdine)', marginBottom: 14 }}>
            Teaser homepage, récap hebdomadaire, onboarding — colle l'URL de la vidéo générée (HeyGen ou autre) une fois prête.
          </p>
          <form action={enregistrerVideos} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label htmlFor="teaser" className="field-label">Teaser homepage</label>
              <input id="teaser" name={CLES_VIDEO.teaser} type="url" defaultValue={videos[CLES_VIDEO.teaser] ?? ''} style={inputStyle} placeholder="https://..." />
            </div>
            <div>
              <label htmlFor="hebdo" className="field-label">Récap hebdomadaire</label>
              <input id="hebdo" name={CLES_VIDEO.hebdo} type="url" defaultValue={videos[CLES_VIDEO.hebdo] ?? ''} style={inputStyle} placeholder="https://..." />
            </div>
            <div>
              <label htmlFor="onboarding" className="field-label">Onboarding</label>
              <input id="onboarding" name={CLES_VIDEO.onboarding} type="url" defaultValue={videos[CLES_VIDEO.onboarding] ?? ''} style={inputStyle} placeholder="https://..." />
            </div>
            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', fontSize: '0.84rem' }}>
              Enregistrer
            </button>
          </form>
        </div>

        <div className="card" style={{ padding: '20px 22px' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: 14 }}>Utilisateurs ({users.length})</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--trait)' }}>
                  <th style={{ padding: '8px 10px' }}>Nom</th>
                  <th style={{ padding: '8px 10px' }}>E-mail</th>
                  <th style={{ padding: '8px 10px' }}>Inscrit le</th>
                  <th style={{ padding: '8px 10px' }}>Abonnement</th>
                  <th style={{ padding: '8px 10px' }}>Crédits</th>
                  <th style={{ padding: '8px 10px' }}>Stripe</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.user_id} style={{ borderBottom: '1px solid var(--trait)' }}>
                    <td style={{ padding: '8px 10px' }}>{u.prenom ? `${u.prenom} ${u.nom ?? ''}`.trim() : <span style={{ color: 'var(--sourdine)' }}>Profil incomplet</span>}</td>
                    <td style={{ padding: '8px 10px' }}>{u.email}</td>
                    <td style={{ padding: '8px 10px' }} className="mono">{u.inscrit_le ? u.inscrit_le.slice(0, 10) : '—'}</td>
                    <td style={{ padding: '8px 10px' }}>
                      {u.abonnement_plan ? (
                        <span className="pill" style={{ padding: '2px 8px', fontSize: '0.72rem' }}>
                          {PLAN_NOMS[u.abonnement_plan] ?? u.abonnement_plan} · {u.abonnement_statut}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--sourdine)' }}>Aucun</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 10px' }} className="mono">{u.solde_credits}</td>
                    <td style={{ padding: '8px 10px' }}>
                      {u.stripe_customer_id ? (
                        <a href={`https://dashboard.stripe.com/customers/${u.stripe_customer_id}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--lever-profond)', textDecoration: 'underline' }}>
                          Voir →
                        </a>
                      ) : (
                        <span style={{ color: 'var(--sourdine)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
