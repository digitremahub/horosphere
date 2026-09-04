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
- `src/app/actualites` — page publique d'actualités (voir "Actualités &
  newsletter" plus bas).
- `src/lib/` — logique métier (zodiaque, planètes en temps réel,
  événements du ciel, crédits, Stripe, auth, IA, contenu réseaux sociaux,
  actualités, newsletter).
- `public/images/` — images du site (logo, bannières photo).

## Déploiement

Déployé sur Vercel (projet `horosphere-live`), connecté à ce dépôt GitHub —
chaque push sur la branche de production déclenche un nouveau déploiement.

Paiements : Stripe (produits/prix et webhook déjà configurés côté Stripe ;
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` et les `STRIPE_PRICE_*` sont
définis dans les variables d'environnement Vercel).

## Promotion réseaux sociaux (équipe IA de contenu)

Pipeline de création + publication pour Instagram, Facebook et TikTok.
L'édition et la validation se font entièrement dans une base **Airtable**
(déléguable à un community manager sans toucher au code) — l'app ne fait
que générer le texte et exposer une API que Make.com appelle.

1. **Génération** (`POST /api/social/generate`, appelé chaque matin par le
   scénario Make "Génération quotidienne") — renvoie le contenu du jour
   (légende, hashtags, visuel suggéré ; script à filmer pour TikTok) pour
   les 3 plateformes. Réutilise la phase lunaire réelle et les prochains
   événements du ciel déjà calculés par l'app (`lib/skyEvents.ts`) ; retombe
   sur un contenu démo déterministe si `ANTHROPIC_API_KEY` n'est pas
   configurée. Make écrit directement le résultat dans la table "Réseaux
   sociaux" de la base Airtable (statut "Brouillon").
2. **Édition et validation** — dans Airtable : le community manager relit,
   ajuste le texte si besoin, puis change le champ Statut sur
   "✅ Publier" (un seul clic, pas de code).
3. **Publication** — le scénario Make "Publication réseaux sociaux"
   surveille la base Airtable ; dès qu'une ligne passe à "✅ Publier", il
   publie sur Facebook/Instagram puis repasse le statut à "Publié". TikTok
   n'a pas de publication automatique (aucun outil de génération vidéo
   dans ce pipeline) : le script proposé est à filmer et publier à la main
   (voir la conversation pour des pistes d'outils, ex. HeyGen).

Variable d'environnement à définir dans Vercel :
- `SOCIAL_AUTOMATION_SECRET` — secret partagé, vérifié sur les appels de
  Make (`x-automation-secret`). À générer une fois (ex. `openssl rand
  -hex 32`) et coller aussi dans Make.

## Actualités & newsletter

`/actualites` est centrée sur **ce qui se passe dans le ciel** (lune,
événements astronomiques, positions planétaires réelles) — pas sur des
annonces d'entreprise. Le contenu est généré automatiquement chaque
semaine (`lib/skyNews.ts`, mêmes données réelles qu'ailleurs dans l'app :
`astronomy-engine`, aucune invention), puis relu et publié par le community
manager dans Airtable, exactement comme les réseaux sociaux.

- `POST /api/news/generate` (appelé chaque semaine par Make) — génère
  l'article du ciel de la semaine ; Make crée le brouillon dans la table
  Airtable "Actualités".
- `news` (voir `db/schema.sql`) est la table publique affichée sur
  `/actualites` — remplie via `POST /api/news/publish` (appelé par Make
  quand une ligne Airtable passe à "✅ Publier").
- **Newsletter hebdomadaire** (`POST /api/newsletter/send-weekly`, appelé
  une fois par semaine par Make) — envoie un résumé des actualités publiées
  dans les 7 derniers jours à tous les utilisateurs inscrits (email requis
  pour tout compte), sauf ceux désinscrits (`profiles.newsletter_opt_in`,
  modifiable depuis `/app/profil` ou via le lien de désabonnement présent
  dans chaque e-mail). N'envoie rien si aucune actualité n'a été publiée
  cette semaine. Envoyée via Resend (`AUTH_RESEND_KEY`/`RESEND_API_KEY`,
  déjà configuré pour la connexion par e-mail).

Schéma de base à exécuter sur Neon si pas déjà fait : table `news` et
colonne `profiles.newsletter_opt_in` (voir `db/schema.sql`).

## Base Airtable "Horosphère — Contenu"

Deux tables, éditées par le community manager, aucune n'a besoin d'être
touchée côté code :
- **Réseaux sociaux** : Date, Plateforme (Instagram/Facebook/TikTok),
  Statut (Brouillon/✅ Publier/Publié/Rejeté), Légende, Hashtags, Visuel
  (URL), Script vidéo (TikTok).
- **Actualités** : Titre, Slug, Résumé, Contenu, Image (URL), Statut
  (Brouillon/✅ Publier/Publié).

Les scénarios Make.com associés (déjà créés dans le compte Make relié) :
- **Horosphère — Génération quotidienne (réseaux sociaux)** — tous les
  jours, appelle `/api/social/generate` puis crée les brouillons dans
  Airtable.
- **Horosphère — Publication réseaux sociaux** — surveille les lignes
  "✅ Publier" dans Airtable, publie sur Facebook/Instagram (connexions à
  finaliser dans Make), repasse le statut à "Publié".
- **Horosphère — Génération actualité du ciel** — chaque semaine, appelle
  `/api/news/generate` puis crée le brouillon dans Airtable.
- **Horosphère — Publication actualités** — surveille les lignes
  "✅ Publier" de la table Actualités, vers `/api/news/publish`.
- **Horosphère — Newsletter hebdomadaire** — une fois par semaine, appelle
  `/api/newsletter/send-weekly`.
