import { getTranslations } from 'next-intl/server';
import { dbConfigured } from '@/lib/db';
import { Link } from '@/i18n/navigation';

// Retour utilisateur : l'aperçu des 4 derniers articles faisait doublon
// avec /actualites (déjà accessible depuis le menu) — remplacé par un
// simple lien-pilule, sans prévisualisation de contenu.
export default async function NewsTeaser() {
  if (!dbConfigured) return null;
  const t = await getTranslations('Home');

  return (
    <section className="container" style={{ padding: '28px 24px', textAlign: 'center' }}>
      <Link href="/actualites" className="pill" style={{ textDecoration: 'none' }}>
        {t('newsPill')} →
      </Link>
    </section>
  );
}
