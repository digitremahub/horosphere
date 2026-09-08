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
  lieu_latitude DOUBLE PRECISION,
  lieu_longitude DOUBLE PRECISION,
  lieu_timezone TEXT,
  telephone TEXT,
  newsletter_opt_in BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- La table `profiles` existait déjà en production avant l'ajout de ces
-- colonnes : CREATE TABLE IF NOT EXISTS ne les rajoute pas sur une table
-- existante, d'où ces ALTER idempotents.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS newsletter_opt_in BOOLEAN NOT NULL DEFAULT true;

-- Coordonnées + fuseau horaire du lieu de naissance, résolus par géocodage
-- à l'enregistrement du profil (lib/geocode.ts) — nécessaires pour
-- calculer un ascendant ou des maisons réels (lib/natal.ts). Absents pour
-- les profils enregistrés avant cet ajout, ou si le géocodage échoue :
-- ces lectures restent alors indisponibles plutôt que d'être approximées.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lieu_latitude DOUBLE PRECISION;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lieu_longitude DOUBLE PRECISION;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lieu_timezone TEXT;

-- Horoscope quotidien envoyé par e-mail (voir lib/dailyHoroscopeEmail.ts) —
-- opt-in explicite et FALSE par défaut, contrairement à newsletter_opt_in :
-- cet envoi consomme un crédit (feature horoscope_quotidien, voir
-- pricing.ts) à chaque fois, ça ne peut pas être une case cochée sans
-- action de l'utilisateur.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS horoscope_email_opt_in BOOLEAN NOT NULL DEFAULT false;

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

-- Traduction à la volée (voir lib/translate.ts) des actualités, mises en
-- cache ici pour ne jamais retraduire deux fois le même article dans la
-- même langue. `fr` n'a jamais de ligne ici (c'est déjà la langue de
-- `news`). Une ligne peut être partielle : translatedTitles() n'écrit que
-- `titre` (liste des actualités), translatedArticle() complète ensuite
-- `resume`/`contenu` quand cet article précis est ouvert.
CREATE TABLE IF NOT EXISTS news_translations (
  news_id UUID NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  titre TEXT,
  resume TEXT,
  contenu TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (news_id, locale)
);

-- ===== Promo de lancement (septembre 2026) =====
-- Compte les bénéficiaires du bonus "100 premiers abonnés" (x2 crédits sur
-- le premier mois) — voir lib/promotions.ts. user_id en clé primaire :
-- un réabonnement ultérieur ne peut jamais redoubler les crédits deux fois.
CREATE TABLE IF NOT EXISTS promo_premiers_abonnes (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== Publications réseaux sociaux (carrousel homepage) =====
-- Copie des posts réellement publiés (Facebook/Instagram), écrite par le
-- scénario Make "Publication réseaux sociaux (posts approuvés)" juste après
-- chaque publication réussie (voir /api/social/record-published). Sert
-- uniquement à alimenter le carrousel de la page d'accueil — la source de
-- vérité éditoriale reste Airtable. airtable_id (l'id de la ligne Airtable)
-- rend l'écriture idempotente : un ré-appel accidentel met juste à jour la
-- même ligne au lieu d'en créer une deuxième.
CREATE TABLE IF NOT EXISTS social_posts (
  id SERIAL PRIMARY KEY,
  airtable_id TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL,
  image_url TEXT,
  caption TEXT NOT NULL DEFAULT '',
  hashtags TEXT,
  publie_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_publie_le ON social_posts (publie_le DESC);

-- ===== Cadeau d'anniversaire (remboursement silencieux, abonnés) =====
-- Une fois par an, pendant le mois de naissance d'un abonné actif, la
-- dernière facture payée de son abonnement est intégralement remboursée
-- via Stripe (voir lib/birthdayRefund.ts, appelé par un cron quotidien) —
-- jamais annoncé nulle part, sur demande explicite : c'est une surprise
-- pure, pas un avantage marketing communiqué. (user_id, year) empêche tout
-- double remboursement la même année, y compris en cas de nouvel essai du
-- cron le lendemain.
CREATE TABLE IF NOT EXISTS birthday_refunds (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  stripe_refund_id TEXT,
  amount_cents INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, year)
);

-- ===== Calendrier de l'avent (acquisition, décembre) =====
-- Une case par jour (1 au 24 décembre), réclamable une seule fois par
-- utilisateur connecté — voir lib/advent.ts. Pas de rattrapage : une case
-- non réclamée le jour même est perdue, comme un vrai calendrier de
-- l'avent. (user_id, year, day) en clé primaire = idempotence naturelle.
CREATE TABLE IF NOT EXISTS advent_claims (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  day INTEGER NOT NULL,
  credits INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, year, day)
);
