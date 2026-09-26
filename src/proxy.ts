import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Toutes les routes sauf les fichiers statiques, les assets Next.js, les
  // routes API et les liens courts de suivi (non traduits, jamais préfixés
  // par une langue) — /r/[code] (voir app/r/[code]/route.ts) est tombé dans
  // ce filtre par erreur avant cet ajout : sans extension de fichier dans
  // l'URL, ce middleware l'interceptait et le réécrivait vers une page
  // localisée inexistante, d'où un 404 au lieu de la redirection UTM prévue.
  matcher: ['/((?!api|r/|_next|_vercel|.*\\..*).*)'],
};
