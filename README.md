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

## Roadmap marketing saisonnier

- **Promo Halloween** : à réfléchir à partir du 21 septembre (demande de
  l'utilisateur, 08/09) — rien de défini pour l'instant (ni offre, ni
  mécanique, ni date de lancement).
- **Calendrier de l'avent** (`lib/advent.ts`, `/app/calendrier-de-lavent`) :
  construit et fonctionnel, mais volontairement caché (lien de navigation
  et accès direct) jusqu'au 20 novembre — le temps qu'une déco de Noël
  soit ajoutée au site. Voir `estPeriodeVisibleAvent()`.
  Programme des 24 jours (`PROGRAMME_AVENT`) : la plupart des jours sont de
  simples crédits, mais quelques jours mettent en avant d'autres leviers :
  - **Parrainage** (jours 5 et 15) : révèle le lien de parrainage
    personnel de l'utilisateur (`lib/referral.ts`, valable toute l'année,
    pas seulement en décembre) — 3 crédits au parrain + 2 au filleul, à la
    création réelle du nouveau compte.
  - **Réduction** (jours 10 et 19) : un code promo Stripe (`AVENT{année}`)
    partagé par tout le monde, 20% de réduction — c'est Stripe
    (`max_redemptions`) qui limite l'usage réel à 20, pas un compteur
    maison.
  - **Tirage au sort** (jour 24, grand prix) : réservé aux abonnés actifs
    (sinon "1 an offert" n'a pas de sens) — inscrit dans `tirage_avent`,
    consolation en crédits pour les non-abonnés. Le tirage lui-même se
    déclenche à la main, une fois, après le 24 décembre :
    `GET /api/admin/tirage-avent?secret=...` — choisit un gagnant au hasard
    (`ORDER BY random()`), lui applique un coupon Stripe 100% pendant 12
    mois sur son abonnement actif. `tirage_gagnants` empêche de rejouer le
    tirage deux fois par erreur.

## Roadmap contenu & produit — Elian & Lya, chatbot, marketplace

Vision stratégique communiquée par l'utilisateur, conservée ici pour
cohérence des futures demandes de développement — **pas à développer
immédiatement, sauf demande explicite** pour chaque brique ci-dessous.

**Contexte marché** : l'astro-coaching (consultations individuelles,
45 €–300 €+ la séance) existe déjà en France mais reste artisanal, cher,
non scalable. Les apps horoscope existantes (Co-Star, The Pattern, apps
françaises) restent purement descriptives/prédictives, sans dimension
actionnable. Horosphère se positionne comme le pont entre ces deux
mondes : l'astro-coaching rendu quotidien et accessible (abonnement à
partir de 9,99 €/mois) — argument à exploiter dans la copy marketing,
sans jamais prétendre remplacer entièrement l'accompagnement humain.

**Phase 1 (actuelle)** :
- Publications quotidiennes Instagram (texte/image), ton "développement
  personnel par les astres" — déjà en place (`lib/social.ts`), sans
  Elian/Lya visuellement pour l'instant (public pas encore familier des
  deux personas).
- Chatbot Instagram à voix unique (pas encore le split Elian/Lya) — pas
  implémenté. Double objectif : acquisition (teaser personnalisé en DM
  → redirection site) et rétention (engagement entre les publications).

**Phase 2 (à venir)** :
- Vidéo hebdomadaire, **dimanche uniquement** pour l'instant : récap de
  la semaine avec Elian et Lya en duo (voir personas et formats
  ci-dessous), générée via HeyGen (`lib/heygen.ts`, `lib/reels.ts`).
- Une vidéo "programme de la semaine à venir" le lundi a été envisagée
  puis **mise de côté pour raison de coût** : le récap dominical consomme
  à lui seul ~70 crédits HeyGen sur un forfait mensuel de 529 — à
  reconsidérer si le forfait est ajusté à la hausse.
- Vidéo promo mensuelle (offres du mois, packs crédits) à intégrer au
  calendrier de contenu.

**Version 3 (bien plus tard, en complément de l'offre actuelle, pas un
remplacement)** :
- Elian/Lya en consultation virtuelle interactive — nécessite un vrai
  moteur conversationnel avec mémoire et personnalisation (chantier
  complexe, pas de brique existante à réutiliser).
- Marketplace d'astro-coachs indépendants intervenant via le site,
  notation bidirectionnelle façon Uber (coach et client), monétisation
  par **commission** (modèle préféré à un tarif fixe ou un abonnement
  d'affichage seul). Objectif espéré : à 1000 abonnés mensuels, ~10% de
  demandes de mise en relation avec un coach humain. Le chatbot Instagram
  (une fois en place) pourrait servir de qualification naturelle vers
  cette marketplace, en détectant les besoins qui dépassent le quotidien.

### Personas Elian & Lya (vidéo hebdo, futur chatbot)

Mini émission vidéo avec deux personnages IA générés via HeyGen (voir
`lib/heygen.ts`). Cohérent avec le positionnement "développement
personnel par les astres" (voir plus haut) : l'astro comme langage,
l'action comme finalité.

**Personas (rôles fixes, jamais interchangés) :**
- **Elian — la voix de l'astro.** Explique le ciel, la cohérence
  astrologique du jour ("le pourquoi cosmique"). Ton pédagogue, posé.
  Conviction : rien n'est arbitraire, comprendre le ciel c'est comprendre
  une part de soi. Registre : cohérence, comprendre, relier, sens,
  pourquoi. Ex. : *"Ce n'est pas un hasard si Mercure fait ça
  aujourd'hui — voici ce que ça révèle."*
- **Lya — la voix de l'action.** Transforme la lecture d'Elian en
  décision, en geste concret du jour. Ton direct, énergique, orienté
  résultat. Conviction : comprendre ne suffit pas, seule l'action du jour
  compte. Registre : action, décision, aujourd'hui, concret, résultat.
  Ex. : *"Peu importe pourquoi, voici ce que tu fais avec ça
  aujourd'hui."*

**3 formats d'épisode, choisis selon la nature du transit du jour (jamais
arbitrairement) :**
1. **Classique** (Elian ouvre → Lya conclut) — transit neutre/équilibré.
2. **Intention** (Lya ouvre → Elian complète) — transit orienté action
   (Mars, Soleil en aspect dynamique).
3. **Tension** (désaccord Lya/Elian → résolution en fin d'épisode) —
   transit introspectif/rétrograde ou aspect tendu (carré, opposition) ;
   à utiliser occasionnellement, pas systématiquement sur ces transits.

**Avatars déjà créés côté HeyGen** : les deux personas existent déjà comme
groupes d'avatars personnalisés sur le compte connecté ("Lya",
`7d62100aa9b54ec080492deb1ec67e02` ; "Elian",
`85e1e66562804042a11123d359912765` — a déjà changé une fois, le groupe a
dû être recréé côté HeyGen ; ces IDs sont centralisés dans
`GROUPE_AVATAR_ELIAN`/`GROUPE_AVATAR_LYA`, lib/heygen.ts) — retrouvables
via `/api/admin/heygen-avatars` (route de diagnostic temporaire, liste
sans paramètre `groupId`) en cas de nouveau changement. L'envoi
automatique du script TikTok marketing quotidien vers HeyGen
(`soumettreVideoAvatarTiktok` dans `lib/social.ts`) est câblé mais
volontairement **désactivé par défaut**, derrière un interrupteur dédié
(`HEYGEN_TIKTOK_AUTO=true`) — **décision explicite de l'utilisateur :
HeyGen ne doit tourner que pour le récap du dimanche**, jamais pour le
TikTok quotidien, même une fois `HEYGEN_AVATAR_ID`/`HEYGEN_VOICE_ID`
configurées pour le récap (ces deux variables ne doivent pas réactiver
la génération quotidienne par effet de bord — d'où l'interrupteur
séparé). L'utilisateur veut décider quel persona utiliser pour le récap
(actualisation des avatars en cours côté HeyGen — "nouvelles vues" à
venir) avant d'activer une génération automatique quotidienne.

**Travail demandé le moment venu** (voir le brief complet dans l'historique
de session si besoin de le retrouver mot pour mot) :
1. Concevoir la règle qui détermine automatiquement le format du jour à
   partir du type de transit astrologique (probablement une extension de
   `lib/aspects.ts`/`lib/planets.ts`, qui exposent déjà rétrogradations et
   aspects).
2. Adapter/créer le module de génération de script pour respecter
   strictement les deux personas (registre lexical, ton, rôle fixe) —
   vraisemblablement un nouveau prompt dans `lib/anthropic.ts` ou un
   fichier dédié, dans l'esprit de `lib/reels.ts`/`lib/heygen.ts` déjà en
   place.
3. Présenter la proposition d'architecture (règles + templates par
   format) avant toute implémentation définitive — l'utilisateur l'a
   explicitement demandé.
