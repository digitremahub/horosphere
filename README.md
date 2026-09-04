# Horosphère

Horoscope quotidien personnalisé par IA — application Next.js (App Router).

## Développement

```bash
npm install
npm run dev
```

## Structure

- `src/app/page.tsx` — page d'accueil (lune du jour, aperçu gratuit, roue
  d'alignement planétaire en direct, compte à rebours des événements du
  ciel, étapes, rituel, forfaits).
- `src/app/connexion`, `src/app/tarifs`, `src/app/app/*` — connexion,
  tarifs, tableau de bord membre, profil/formulaire de naissance,
  historique des lectures.
- `src/app/admin/social` — validation humaine du contenu réseaux sociaux
  généré chaque jour (voir "Promotion réseaux sociaux" plus bas).
- `src/lib/` — logique métier (zodiaque, planètes en temps réel,
  événements du ciel, crédits, Stripe, auth, IA, contenu réseaux sociaux).
- `public/images/` — images du site (logo, bannières photo).

## Déploiement

Déployé sur Vercel (projet `horosphere-live`), connecté à ce dépôt GitHub —
chaque push sur la branche de production déclenche un nouveau déploiement.

Paiements : Stripe (produits/prix et webhook déjà configurés côté Stripe ;
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` et les `STRIPE_PRICE_*` sont
définis dans les variables d'environnement Vercel).

## Promotion réseaux sociaux (équipe IA de contenu)

Pipeline de création + publication automatisée pour Instagram, Facebook et
TikTok, orchestré par des scénarios Make.com qui appellent l'API de
l'application. Rien n'est jamais publié sans validation humaine.

1. **Génération** (`POST /api/social/generate`, appelé chaque matin par
   Make) — écrit le contenu du jour (légende, hashtags, visuel suggéré ;
   script à filmer pour TikTok) en base, au statut `brouillon`. Réutilise la
   phase lunaire réelle et les prochains événements du ciel déjà calculés
   par l'app (`lib/skyEvents.ts`) ; retombe sur un contenu démo déterministe
   si `ANTHROPIC_API_KEY` n'est pas configurée.
2. **Validation** — sur `/admin/social` (réservé aux adresses listées dans
   `ADMIN_EMAILS`), approuver ou rejeter chaque brouillon.
3. **Publication** (`GET /api/social/ready` puis `POST
   /api/social/[id]/publish`, appelés par Make) — Make récupère les posts
   approuvés, les publie sur Facebook/Instagram, puis confirme la
   publication. TikTok n'a pas de publication automatique (aucun outil de
   génération vidéo dans ce pipeline) : le script proposé est à filmer et
   publier à la main.

Variables d'environnement à définir dans Vercel :
- `SOCIAL_AUTOMATION_SECRET` — secret partagé, vérifié sur les appels de
  Make (`x-automation-secret`). À générer une fois (ex. `openssl rand
  -hex 32`) et coller aussi dans Make.
- `ADMIN_EMAILS` — adresses autorisées sur `/admin/social`, séparées par
  des virgules (défaut : `digitrema@gmail.com`).
- `NEXT_PUBLIC_SITE_URL` — domaine public du site, utilisé pour construire
  l'URL absolue des visuels envoyés à Make (défaut :
  `https://horosphere-live.vercel.app`).

Schéma de base : table `social_posts` (voir `db/schema.sql`) — à exécuter
une fois sur la base Neon si elle n'y est pas déjà.
