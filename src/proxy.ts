import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Toutes les routes sauf les fichiers statiques, les assets Next.js et
  // les routes API (non traduites, jamais préfixées par une langue).
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
