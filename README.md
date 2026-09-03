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
- `src/lib/` — logique métier (zodiaque, planètes en temps réel,
  événements du ciel, crédits, Stripe, auth, IA).
- `public/images/` — images du site (logo, bannières photo).

## Déploiement

Déployé sur Vercel (projet `horosphere-live`), connecté à ce dépôt GitHub —
chaque push sur la branche de production déclenche un nouveau déploiement.

Paiements : Stripe (produits/prix et webhook déjà configurés côté Stripe ;
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` et les `STRIPE_PRICE_*` sont
définis dans les variables d'environnement Vercel).
