import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { isAdminEmail } from '@/lib/socialAuth';
import { listPosts, type SocialPost } from '@/lib/socialStore';
import { dbConfigured } from '@/lib/db';
import SocialDecisionButtons from '@/components/SocialDecisionButtons';

export const metadata = {
  title: 'Validation réseaux sociaux — Horosphère',
};

const PLATEFORME_LABEL: Record<string, string> = {
  instagram: '📸 Instagram',
  facebook: '👍 Facebook',
  tiktok: '🎬 TikTok',
};

const STATUT_LABEL: Record<string, { texte: string; couleur: string }> = {
  brouillon: { texte: 'À valider', couleur: 'var(--ambre)' },
  approuve: { texte: 'Approuvé — en attente de publication', couleur: 'var(--sauge)' },
  rejete: { texte: 'Rejeté', couleur: 'var(--sourdine)' },
  publie: { texte: 'Publié', couleur: 'var(--lever-profond)' },
};

function PostCard({ post }: { post: SocialPost }) {
  const statut = STATUT_LABEL[post.statut] ?? { texte: post.statut, couleur: 'var(--sourdine)' };
  const date = new Date(post.post_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="card" style={{ padding: '20px 22px', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <span style={{ fontWeight: 600 }}>{PLATEFORME_LABEL[post.plateforme] ?? post.plateforme}</span>
          <span className="mono" style={{ fontSize: '0.76rem', color: 'var(--sourdine)', marginLeft: 10 }}>{date}</span>
        </div>
        <span className="pill" style={{ borderColor: statut.couleur, color: statut.couleur, fontSize: '0.72rem' }}>
          {statut.texte}
          {post.mode === 'demo' ? ' · démo' : ''}
        </span>
      </div>

      {post.image_url && (
        <div className="photo-frame" style={{ height: 140, marginBottom: 12 }}>
          <img src={post.image_url} alt="" loading="lazy" />
        </div>
      )}

      <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 8px', fontSize: '0.92rem' }}>{post.legende}</p>
      <p className="mono" style={{ fontSize: '0.78rem', color: 'var(--lever-profond)', margin: '0 0 12px' }}>{post.hashtags}</p>

      {post.script_video && (
        <div style={{ background: 'var(--brume)', border: '1px dashed var(--trait)', borderRadius: 12, padding: '12px 14px', marginBottom: 14, whiteSpace: 'pre-wrap', fontSize: '0.84rem' }}>
          {post.script_video}
        </div>
      )}

      {post.statut === 'brouillon' && <SocialDecisionButtons id={post.id} />}
    </div>
  );
}

export default async function AdminSocialPage() {
  const session = await auth();
  const email = (session?.user as { email?: string } | undefined)?.email;
  if (!session?.user) {
    redirect('/connexion');
  }
  if (!isAdminEmail(email)) {
    redirect('/');
  }

  let posts: SocialPost[] = [];
  let error: string | null = null;
  if (dbConfigured) {
    try {
      posts = await listPosts({ limit: 60 });
    } catch {
      error = "Impossible de charger les posts pour le moment.";
    }
  } else {
    error = "La base de données n'est pas encore connectée.";
  }

  const aValider = posts.filter((p) => p.statut === 'brouillon');
  const autres = posts.filter((p) => p.statut !== 'brouillon');

  return (
    <main className="container-narrow" style={{ paddingTop: 48, paddingBottom: 96 }}>
      <div className="pill" style={{ marginBottom: 16 }}>Équipe IA · Réseaux sociaux</div>
      <h1 style={{ fontSize: '1.8rem', marginBottom: 10 }}>Validation du contenu</h1>
      <p style={{ color: 'var(--ombre)', fontSize: '0.9rem', marginBottom: 32 }}>
        Généré chaque matin pour Instagram, Facebook et TikTok. Rien n'est publié sans votre validation ici —
        approuvez pour laisser Make.com publier automatiquement (Instagram/Facebook), rejetez pour ignorer.
        TikTok n'a pas de publication automatique (pas de génération vidéo) : le script proposé est à filmer et
        publier manuellement.
      </p>

      {error && (
        <div className="card" style={{ padding: '14px 18px', marginBottom: 24, borderColor: 'var(--lever)', color: 'var(--lever-profond)', fontSize: '0.86rem' }}>
          {error}
        </div>
      )}

      <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>À valider {aValider.length > 0 && `(${aValider.length})`}</h2>
      {aValider.length === 0 && !error && (
        <p style={{ color: 'var(--sourdine)', fontSize: '0.86rem', marginBottom: 32 }}>Rien à valider pour le moment.</p>
      )}
      {aValider.map((post) => <PostCard key={post.id} post={post} />)}

      {autres.length > 0 && (
        <>
          <h2 style={{ fontSize: '1.1rem', margin: '32px 0 14px' }}>Historique</h2>
          {autres.map((post) => <PostCard key={post.id} post={post} />)}
        </>
      )}
    </main>
  );
}
