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
import { grantCredits } from '@/lib/credits';
import { offrirMoisAbonnement } from '@/lib/adminSubscriptions';
import { listConfiguredPromotions } from '@/lib/promotions';
import { SUBSCRIPTIONS, CREDIT_EXPIRY_DAYS } from '@/lib/pricing';

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

  async function offrirCredits(formData: FormData) {
    'use server';
    const session = await auth();
    const email = (session?.user as { email?: string | null } | undefined)?.email;
    if (!isAdminEmail(email)) return;
    const userId = Number(formData.get('userId'));
    const credits = Math.trunc(Number(formData.get('credits')));
    // Même durée de vie que les crédits achetés (packs) — un cadeau qui
    // n'expire jamais serait incohérent avec le reste du système de
    // crédits, et pourrait s'accumuler indéfiniment sans que personne ne
    // s'en aperçoive.
    if (userId > 0 && credits > 0 && credits <= 1000) {
      await grantCredits(userId, credits, 'admin:offert', CREDIT_EXPIRY_DAYS);
    }
    redirect({ href: { pathname: '/app/admin', query: { ok: `credits:${credits}` } }, locale });
  }

  async function offrirAbonnement(formData: FormData) {
    'use server';
    const session = await auth();
    const email = (session?.user as { email?: string | null } | undefined)?.email;
    if (!isAdminEmail(email)) return;
    const userId = Number(formData.get('userId'));
    const mois = Math.trunc(Number(formData.get('mois')));
    const resultat = await offrirMoisAbonnement(userId, mois);
    redirect({
      href: { pathname: '/app/admin', query: { ok: `abo:${resultat.ok ? '1' : '0'}:${encodeURIComponent(resultat.message)}` } },
      locale,
    });
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
  const promotions = await listConfiguredPromotions();

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
        {ok?.startsWith('credits:') && (
          <div className="card" style={{ padding: '12px 16px', marginBottom: 20, fontSize: '0.84rem', color: 'var(--lever-profond)' }}>
            {ok.split(':')[1]} crédit(s) offert(s).
          </div>
        )}
        {ok?.startsWith('abo:') && (() => {
          const [, succes, ...reste] = ok.split(':');
          const message = decodeURIComponent(reste.join(':'));
          return (
            <div className="card" style={{ padding: '12px 16px', marginBottom: 20, fontSize: '0.84rem', color: 'var(--lever-profond)', borderColor: succes === '1' ? undefined : 'var(--lever)' }}>
              {message}
            </div>
          );
        })()}
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

        {promotions.length > 0 && (
          <div className="card" style={{ padding: '20px 22px', marginBottom: 28 }}>
            <h2 style={{ fontSize: '1rem', marginBottom: 4 }}>Promotions</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--sourdine)', marginBottom: 14 }}>
              Configurées dans le code (lib/promotions.ts) — une nouvelle promotion s'y ajoute pour apparaître ici, pas encore de création depuis cette page.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {promotions.map((p) => {
                const couleur = p.statut === 'active' ? 'var(--sauge)' : p.statut === 'a_venir' ? 'var(--ambre)' : 'var(--sourdine)';
                const statutLabel = p.statut === 'active' ? '● En cours' : p.statut === 'a_venir' ? '○ À venir' : '○ Terminée';
                return (
                  <div key={p.nom} style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid var(--trait)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.9rem' }}>{p.nom}</strong>
                      <span className="mono" style={{ fontSize: '0.72rem', color: couleur }}>{statutLabel}</span>
                    </div>
                    <p style={{ margin: '0 0 6px', fontSize: '0.82rem', color: 'var(--ombre)' }}>{p.description}</p>
                    <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--sourdine)' }}>
                      Du {p.debut.toLocaleDateString('fr-FR')} au {p.fin.toLocaleDateString('fr-FR')}
                      {p.quotaTotal !== undefined && ` · ${p.quotaRestant}/${p.quotaTotal} places restantes`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="card" style={{ padding: '20px 22px', marginBottom: 28 }}>
          <h2 style={{ fontSize: '1rem', marginBottom: 4 }}>Actions rapides</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--sourdine)', marginBottom: 14 }}>
            La gestion fine d'un abonnement (annulation, remboursement ponctuel, moyen de paiement) reste dans le Dashboard Stripe — le lien direct vers le bon client est dans le tableau ci-dessous.
            <strong> Pour offrir des crédits à un utilisateur, ce n'est pas sur Stripe : utilisez le formulaire « 🎁 Offrir des crédits » de sa ligne, dans le tableau plus bas.</strong>
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
                  <th style={{ padding: '8px 10px' }}>Offrir des crédits</th>
                  <th style={{ padding: '8px 10px' }}>Offrir des mois</th>
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
                      <form action={offrirCredits} style={{ display: 'flex', gap: 6 }}>
                        <input type="hidden" name="userId" value={u.user_id} />
                        <input
                          type="number"
                          name="credits"
                          min={1}
                          max={1000}
                          placeholder="5"
                          style={{ ...inputStyle, width: 64, padding: '5px 8px' }}
                        />
                        <button type="submit" className="btn btn-ghost" style={{ fontSize: '0.74rem', padding: '5px 10px' }}>
                          Offrir
                        </button>
                      </form>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      {u.abonnement_plan ? (
                        <form action={offrirAbonnement} style={{ display: 'flex', gap: 6 }}>
                          <input type="hidden" name="userId" value={u.user_id} />
                          <input
                            type="number"
                            name="mois"
                            min={1}
                            max={12}
                            placeholder="1"
                            style={{ ...inputStyle, width: 56, padding: '5px 8px' }}
                          />
                          <button type="submit" className="btn btn-ghost" style={{ fontSize: '0.74rem', padding: '5px 10px', whiteSpace: 'nowrap' }}>
                            🎁 Offrir
                          </button>
                        </form>
                      ) : (
                        <span style={{ color: 'var(--sourdine)' }}>—</span>
                      )}
                    </td>
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
