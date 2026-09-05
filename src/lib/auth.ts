import NextAuth from 'next-auth';
import PostgresAdapter from '@auth/pg-adapter';
import Resend from 'next-auth/providers/resend';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { sql } from './db';
import { grantCredits } from './credits';
import { creditsBienvenue } from './promotions';

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
  // JWT plutôt que sessions en base : le provider Credentials (mot de
  // passe) n'écrit jamais dans la table `sessions` de l'adaptateur, quelle
  // que soit cette config — avec la stratégie "database", la session créée
  // par une connexion par mot de passe ne serait donc jamais retrouvée au
  // chargement des pages suivantes. Le lien magique et les futurs
  // providers OAuth fonctionnent aussi bien avec le JWT.
  session: { strategy: 'jwt' },
  providers: [
    Resend({
      from: process.env.EMAIL_FROM || 'Horosphère <onboarding@resend.dev>',
      apiKey: process.env.AUTH_RESEND_KEY || process.env.RESEND_API_KEY,
    }),
    Credentials({
      id: 'password',
      name: 'Mot de passe',
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        const email = String(credentials?.email || '').trim().toLowerCase();
        const password = String(credentials?.password || '');
        if (!email || !password || !sql) return null;

        const rows = await sql<{ id: number; name: string | null; email: string; password_hash: string | null }[]>`
          SELECT id, name, email, password_hash FROM users WHERE email = ${email}
        `;
        const user = rows[0];
        if (!user?.password_hash) return null;

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return null;

        return { id: String(user.id), name: user.name, email: user.email };
      },
    }),
  ],
  pages: {
    signIn: '/connexion',
    verifyRequest: '/connexion?envoye=1',
    // Sans ça, une erreur non prévue explicitement (ex. Resend qui refuse
    // d'envoyer, mauvaise config) atterrit sur la page d'erreur générique
    // d'Auth.js ("There was a problem with the server configuration"),
    // hors de notre charte graphique — /connexion l'affiche à la place,
    // via le paramètre ?error= qu'Auth.js ajoute lui-même.
    error: '/connexion',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as typeof session.user & { id: string }).id = token.id as string;
      }
      return session;
    },
  },
  events: {
    // Crédits de bienvenue : promis sur la page d'accueil, accordés une
    // seule fois, au moment où l'adaptateur crée la ligne `users`. Voir
    // lib/promotions.ts : 10 crédits (valables 7 jours) au lieu de 3
    // pendant la promo de lancement de septembre 2026.
    async createUser({ user }) {
      try {
        const { credits, expirationJours, source } = creditsBienvenue();
        await grantCredits(Number(user.id), credits, source, expirationJours);
      } catch (err) {
        console.error('Échec de l\'octroi des crédits de bienvenue', err);
      }
    },
  },
});

export const authConfigured = Boolean(process.env.DATABASE_URL && (process.env.AUTH_RESEND_KEY || process.env.RESEND_API_KEY));

// Connexion par mot de passe : ne dépend que de la base (pas de Resend).
export const passwordAuthConfigured = Boolean(process.env.DATABASE_URL);
