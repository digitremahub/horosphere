import NextAuth from 'next-auth';
import PostgresAdapter from '@auth/pg-adapter';
import Resend from 'next-auth/providers/resend';
import { Pool } from 'pg';
import { grantCredits } from './credits';
import { CREDIT_EXPIRY_DAYS, WELCOME_CREDITS } from './pricing';

declare global {
  // eslint-disable-next-line no-var
  var __horospherePgPool: Pool | undefined;
}

function getPool(): Pool | undefined {
  if (!process.env.DATABASE_URL) return undefined;
  if (!globalThis.__horospherePgPool) {
    globalThis.__horospherePgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost') ? undefined : { rejectUnauthorized: false },
      max: 10,
    });
  }
  return globalThis.__horospherePgPool;
}

const pool = getPool();

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: pool ? PostgresAdapter(pool) : undefined,
  session: { strategy: 'database' },
  providers: [
    Resend({
      from: process.env.EMAIL_FROM || 'Horosphère <onboarding@resend.dev>',
      apiKey: process.env.AUTH_RESEND_KEY || process.env.RESEND_API_KEY,
    }),
  ],
  pages: {
    signIn: '/connexion',
    verifyRequest: '/connexion?envoye=1',
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        (session.user as typeof session.user & { id: string }).id = user.id;
      }
      return session;
    },
  },
  events: {
    // Crédits de bienvenue : promis sur la page d'accueil, accordés une
    // seule fois, au moment où l'adaptateur crée la ligne `users`.
    async createUser({ user }) {
      try {
        await grantCredits(Number(user.id), WELCOME_CREDITS, 'signup:bienvenue', CREDIT_EXPIRY_DAYS);
      } catch (err) {
        console.error('Échec de l\'octroi des crédits de bienvenue', err);
      }
    },
  },
});

export const authConfigured = Boolean(process.env.DATABASE_URL && (process.env.AUTH_RESEND_KEY || process.env.RESEND_API_KEY));
