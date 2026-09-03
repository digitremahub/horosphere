#!/usr/bin/env node
// Crée les 8 produits/prix Stripe (5 packs + 3 abonnements) à partir de la
// grille tarifaire d'Horosphère, et affiche les variables d'environnement
// à copier dans Vercel (Project Settings → Environment Variables).
//
// Usage :
//   STRIPE_SECRET_KEY=sk_live_... npm run setup:stripe
//
// Sûr à relancer : si un produit du même nom existe déjà, il est réutilisé
// plutôt que dupliqué.

import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('❌ Définis STRIPE_SECRET_KEY avant de lancer ce script.');
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: '2024-06-20' });

// Garder ces valeurs synchronisées avec src/lib/pricing.ts
const PACKS = [
  { slug: 'initiation', nom: 'Horosphère — Pack Initiation', prixCentimes: 299, envKey: 'STRIPE_PRICE_PACK_INITIATION' },
  { slug: 'eveil', nom: 'Horosphère — Pack Éveil', prixCentimes: 699, envKey: 'STRIPE_PRICE_PACK_EVEIL' },
  { slug: 'connexion', nom: 'Horosphère — Pack Connexion', prixCentimes: 1299, envKey: 'STRIPE_PRICE_PACK_CONNEXION' },
  { slug: 'illumination', nom: 'Horosphère — Pack Illumination', prixCentimes: 1999, envKey: 'STRIPE_PRICE_PACK_ILLUMINATION' },
  { slug: 'eternite', nom: 'Horosphère — Pack Éternité', prixCentimes: 3499, envKey: 'STRIPE_PRICE_PACK_ETERNITE' },
];

const SUBS = [
  { slug: 'essentiel', nom: 'Horosphère — Abonnement', prixCentimesParMois: 999, envKey: 'STRIPE_PRICE_SUB_ESSENTIEL' },
  { slug: 'premium', nom: 'Horosphère — Abonnement Premium', prixCentimesParMois: 1999, envKey: 'STRIPE_PRICE_SUB_PREMIUM' },
  { slug: 'vip', nom: 'Horosphère — Abonnement VIP', prixCentimesParMois: 3499, envKey: 'STRIPE_PRICE_SUB_VIP' },
];

async function findOrCreateProduct(name) {
  const existing = await stripe.products.search({ query: `name:"${name}" AND active:"true"` });
  if (existing.data[0]) return existing.data[0];
  return stripe.products.create({ name });
}

async function main() {
  const lines = [];

  for (const pack of PACKS) {
    const product = await findOrCreateProduct(pack.nom);
    const price = await stripe.prices.create({
      product: product.id,
      currency: 'eur',
      unit_amount: pack.prixCentimes,
    });
    lines.push(`${pack.envKey}=${price.id}`);
    console.log(`✔ ${pack.nom} → ${price.id}`);
  }

  for (const sub of SUBS) {
    const product = await findOrCreateProduct(sub.nom);
    const price = await stripe.prices.create({
      product: product.id,
      currency: 'eur',
      unit_amount: sub.prixCentimesParMois,
      recurring: { interval: 'month' },
    });
    lines.push(`${sub.envKey}=${price.id}`);
    console.log(`✔ ${sub.nom} → ${price.id}`);
  }

  console.log('\n— Colle ces lignes dans les variables d\'environnement Vercel —\n');
  console.log(lines.join('\n'));
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
