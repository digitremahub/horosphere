// Source unique de vérité pour la grille tarifaire Horosphère.
// Les `envKey` pointent vers les variables d'environnement contenant les
// Price ID Stripe créés par scripts/setup-stripe.mjs (ou à la main dans le
// Dashboard Stripe). Rien n'est codé en dur côté Stripe : tant que la
// variable n'est pas définie, le forfait s'affiche mais l'achat est désactivé.

export type CreditPack = {
  slug: string;
  emoji: string;
  nom: string;
  prixCentimes: number;
  credits: number;
  accroche: string;
  envKey: string;
};

export type Subscription = {
  slug: string;
  emoji: string;
  nom: string;
  prixCentimesParMois: number;
  creditsParMois: number;
  avantage: string;
  envKey: string;
  misEnAvant?: boolean;
};

export const CREDIT_PACKS: CreditPack[] = [
  { slug: 'initiation', emoji: '🌙', nom: 'Initiation', prixCentimes: 299, credits: 3, accroche: 'Découvrir Horosphère', envKey: 'STRIPE_PRICE_PACK_INITIATION' },
  { slug: 'eveil', emoji: '✨', nom: 'Éveil', prixCentimes: 699, credits: 10, accroche: 'Petit usage ponctuel', envKey: 'STRIPE_PRICE_PACK_EVEIL' },
  { slug: 'connexion', emoji: '🔮', nom: 'Connexion', prixCentimes: 1299, credits: 25, accroche: 'Utilisateur régulier', envKey: 'STRIPE_PRICE_PACK_CONNEXION' },
  { slug: 'illumination', emoji: '🌌', nom: 'Illumination', prixCentimes: 1999, credits: 50, accroche: 'Gros pack', envKey: 'STRIPE_PRICE_PACK_ILLUMINATION' },
  { slug: 'eternite', emoji: '👑', nom: 'Éternité', prixCentimes: 3499, credits: 100, accroche: 'Meilleur rapport volume', envKey: 'STRIPE_PRICE_PACK_ETERNITE' },
];

export const SUBSCRIPTIONS: Subscription[] = [
  { slug: 'essentiel', emoji: '🌙', nom: 'Horosphère', prixCentimesParMois: 999, creditsParMois: 80, avantage: 'Tarif préférentiel', envKey: 'STRIPE_PRICE_SUB_ESSENTIEL' },
  { slug: 'premium', emoji: '✨', nom: 'Horosphère Premium', prixCentimesParMois: 1999, creditsParMois: 200, avantage: 'Accès premium', envKey: 'STRIPE_PRICE_SUB_PREMIUM', misEnAvant: true },
  { slug: 'vip', emoji: '👑', nom: 'Horosphère VIP', prixCentimesParMois: 3499, creditsParMois: 400, avantage: 'Expérience complète', envKey: 'STRIPE_PRICE_SUB_VIP' },
];

// Combien coûte chaque fonctionnalité, en crédits.
export const FEATURE_COSTS = {
  horoscope_quotidien: 1,
  vision_hebdomadaire: 2,
  snapshot_natal: 3,
  horoscope_personnalise: 2,
  analyse_sentimentale: 3,
  compatibilite_amoureuse: 5,
  theme_astral_complet: 10,
  grande_analyse: 15,
  cycle_lunaire: 3,
  transits_planetaires: 4,
  horoscope_carriere: 2,
  horoscope_amoureux: 2,
  aide_decision: 3,
  guidance_spirituelle: 5,
} as const;

export type FeatureKey = keyof typeof FEATURE_COSTS;

export type FeatureCategory = 'lectures' | 'guidance';

export const FEATURE_CATEGORIES: Record<FeatureCategory, { titre: string }> = {
  lectures: { titre: 'Vos lectures' },
  guidance: { titre: 'Guidance thématique' },
};

export const FEATURE_LABELS: Record<
  FeatureKey,
  { nom: string; description: string; disponible: boolean; categorie: FeatureCategory; subscriptionOnly?: boolean }
> = {
  horoscope_quotidien: { nom: 'Horoscope du jour', description: "Une lecture quotidienne pour guider ta journée.", disponible: true, categorie: 'lectures' },
  vision_hebdomadaire: { nom: 'Vision hebdomadaire', description: "Une vision claire de ta semaine à venir.", disponible: true, categorie: 'lectures' },
  snapshot_natal: { nom: 'Snapshot Natal', description: "Une analyse rapide de votre thème natal.", disponible: true, categorie: 'lectures' },
  horoscope_personnalise: { nom: 'Horoscope personnalisé', description: "Basé sur votre date, heure et lieu de naissance.", disponible: true, categorie: 'lectures' },
  analyse_sentimentale: { nom: 'Analyse sentimentale', description: "Ce que traverse votre cœur cette semaine.", disponible: true, categorie: 'lectures' },
  compatibilite_amoureuse: { nom: 'Compatibilité amoureuse', description: "Comparez deux signes en détail.", disponible: true, categorie: 'lectures' },
  theme_astral_complet: { nom: 'Thème astral complet', description: "Votre carte du ciel à la naissance.", disponible: true, categorie: 'lectures' },
  grande_analyse: { nom: 'Grande analyse personnalisée', description: "Un bilan long format, tous les axes.", disponible: true, categorie: 'lectures' },
  cycle_lunaire: { nom: 'Cycle lunaire', description: "Synchronise-toi avec les phases de la lune.", disponible: true, categorie: 'lectures', subscriptionOnly: true },
  transits_planetaires: { nom: 'Transits planétaires', description: "Analyse des transits en cours sur ton thème.", disponible: true, categorie: 'lectures', subscriptionOnly: true },
  horoscope_carriere: { nom: 'Horoscope carrière', description: "Éclaire ton chemin professionnel avec les astres.", disponible: true, categorie: 'guidance', subscriptionOnly: true },
  horoscope_amoureux: { nom: 'Horoscope amoureux', description: "Découvre les influences astrales sur ta vie sentimentale.", disponible: true, categorie: 'guidance', subscriptionOnly: true },
  aide_decision: { nom: 'Aide à la décision', description: "Éclairage astrologique pour tes choix importants.", disponible: true, categorie: 'guidance', subscriptionOnly: true },
  guidance_spirituelle: { nom: 'Guidance spirituelle', description: "Une lecture profonde pour ton évolution spirituelle.", disponible: true, categorie: 'guidance', subscriptionOnly: true },
};

// Les crédits achetés (packs) expirent 45 jours après l'achat.
// Les crédits d'abonnement sont remis à zéro et rechargés à chaque cycle :
// ils n'ont pas besoin de cette expiration glissante.
export const CREDIT_EXPIRY_DAYS = 45;

// Crédits offerts à la création de compte (promesse affichée sur la page
// d'accueil : "vous recevez vos premiers crédits offerts"). Accordés une
// seule fois, à la création de l'utilisateur (voir events.createUser dans
// lib/auth.ts). Même durée de vie que les packs achetés.
export const WELCOME_CREDITS = 3;

export function euros(centimes: number): string {
  return (centimes / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
