// Diagnostic ponctuel — à retirer une fois le bug de traduction élucidé.
// Renvoie l'état brut du cache news_translations pour un slug donné, et
// tente une traduction à la volée pour voir l'erreur exacte si ça échoue.
import { NextRequest, NextResponse } from 'next/server';
import { requireDb, dbConfigured } from '@/lib/db';
import { getNewsBySlug } from '@/lib/news';
import { translatedArticle } from '@/lib/translate';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  if (secret !== process.env.SOCIAL_AUTOMATION_SECRET) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  if (!dbConfigured) return NextResponse.json({ error: 'db' }, { status: 503 });

  const slug = searchParams.get('slug') || '';
  const locale = (searchParams.get('locale') || 'en') as 'en' | 'es';
  const item = await getNewsBySlug(slug);
  if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const sql = requireDb();
  if (searchParams.get('purge') === '1') {
    await sql`DELETE FROM news_translations WHERE news_id = ${item.id} AND locale = ${locale}`;
  }
  const cachedRows = await sql`SELECT * FROM news_translations WHERE news_id = ${item.id}`;

  let translationAttempt: unknown = null;
  let translationError: string | null = null;
  try {
    translationAttempt = await translatedArticle(
      { id: item.id, titre: item.titre, resume: item.resume, contenu: item.contenu },
      locale
    );
  } catch (err) {
    translationError = err instanceof Error ? err.stack || err.message : String(err);
  }

  return NextResponse.json({
    newsId: item.id,
    titreOriginal: item.titre,
    cachedRows,
    translationAttempt,
    translationError,
  });
}
