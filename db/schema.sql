-- Schéma Postgres pour Horosphère.
-- À exécuter une fois sur la base connectée via DATABASE_URL
-- (psql "$DATABASE_URL" -f db/schema.sql), par ex. une base Neon
-- rattachée au projet Vercel (onglet Storage).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===== Auth.js (NextAuth) — schéma standard @auth/pg-adapter =====

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  "emailVerified" TIMESTAMPTZ,
  image TEXT,
  password_hash TEXT
);

-- Connexion par mot de passe (en plus du lien magique par e-mail) — ajoutée
-- après la création initiale de la table : CREATE TABLE IF NOT EXISTS ne
-- rajoute pas la colonne sur une base déjà existante, d'où cet ALTER
-- idempotent (voir lib/auth.ts et /inscription).
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  "providerAccountId" VARCHAR(255) NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  id_token TEXT,
  scope TEXT,
  session_state TEXT,
  token_type TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL,
  "sessionToken" VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS verification_token (
  identifier TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  token TEXT NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- ===== Horosphère : crédits, paiements, usage =====

-- Un "lot" de crédits : soit un pack acheté (expire 45 jours après achat),
-- soit la recharge mensuelle d'un abonnement (n'expire pas, remplacée au
-- cycle suivant). credits_remaining diminue à chaque consommation.
CREATE TABLE IF NOT EXISTS credit_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credits_total INTEGER NOT NULL,
  credits_remaining INTEGER NOT NULL,
  source TEXT NOT NULL, -- ex: 'pack:initiation', 'sub:premium:2026-09'
  expires_at TIMESTAMPTZ, -- NULL = n'expire pas
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_lots_user ON credit_lots (user_id);
CREATE INDEX IF NOT EXISTS idx_credit_lots_expiry ON credit_lots (user_id, expires_at);

-- Journal de consommation, pour l'historique affiché à l'utilisateur.
-- `reading` conserve le contenu complet de la lecture générée (JSON), pour
-- pouvoir la réafficher telle quelle plus tard sans la régénérer.
CREATE TABLE IF NOT EXISTS credit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  credits_spent INTEGER NOT NULL,
  sign TEXT,
  reading JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_usage_user ON credit_usage (user_id, created_at DESC);

-- Mapping utilisateur <-> client Stripe.
CREATE TABLE IF NOT EXISTS stripe_customers (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE
);

-- Abonnement actif (au plus un par utilisateur à la fois côté Stripe).
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY, -- Stripe subscription id
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_slug TEXT NOT NULL, -- 'essentiel' | 'premium' | 'vip'
  status TEXT NOT NULL, -- 'active' | 'past_due' | 'canceled' ...
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions (user_id);

-- Idempotence des webhooks Stripe (un event ne doit être traité qu'une fois).
CREATE TABLE IF NOT EXISTS processed_stripe_events (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profil obligatoire, rempli juste après l'inscription : identité + données
-- de naissance (pour un thème astral vraiment personnalisé), et téléphone
-- optionnel (pour l'envoi de l'horoscope chaque matin, fonctionnalité à venir).
CREATE TABLE IF NOT EXISTS profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  date_naissance DATE NOT NULL,
  heure_naissance TIME,
  lieu_naissance TEXT NOT NULL,
  telephone TEXT,
  newsletter_opt_in BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- La table `profiles` existait déjà en production avant l'ajout de cette
-- colonne : CREATE TABLE IF NOT EXISTS ne la rajoute pas sur une table
-- existante, d'où cet ALTER idempotent.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS newsletter_opt_in BOOLEAN NOT NULL DEFAULT true;

-- ===== Promotion réseaux sociaux =====
-- La validation et l'édition du contenu se font désormais dans une base
-- Airtable (déléguable à un community manager, sans toucher au code) —
-- voir /api/social/generate pour la génération, consommée par un scénario
-- Make.com qui écrit dans Airtable. L'app ne stocke plus ces brouillons.

-- ===== Actualités (page publique + source de la newsletter) =====
-- Éditées dans Airtable par le community manager ; publiées ici via
-- /api/news/publish (appelé par Make quand le statut Airtable passe à
-- "Publier"). C'est la table que /actualites affiche et que la newsletter
-- hebdomadaire résume.
CREATE TABLE IF NOT EXISTS news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  titre TEXT NOT NULL,
  resume TEXT NOT NULL DEFAULT '',
  contenu TEXT NOT NULL,
  image_url TEXT,
  publie BOOLEAN NOT NULL DEFAULT false,
  publie_le TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_news_publie ON news (publie, publie_le DESC);
