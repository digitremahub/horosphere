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

// 3 packs (au lieu de 5) et 2 abonnements (au lieu de 3) — retour d'audit :
// trop de choix d'un coup (5+3+14 lignes de tarifs) créait une paralysie du
// choix. Retiré : "Premier Pas" (3 crédits, quasi un jeton d'essai — déjà
// couvert par les crédits de bienvenue offerts à l'inscription) et "Cap"
// (50 crédits, redondant entre "Rythme" et "Horizon"). Aucun client actif
// au moment de ce changement (voir historique) : rien à migrer.
export const CREDIT_PACKS: CreditPack[] = [
  { slug: 'eveil', emoji: '🚀', nom: 'Élan', prixCentimes: 699, credits: 10, accroche: 'Petit usage ponctuel', envKey: 'STRIPE_PRICE_PACK_EVEIL' },
  { slug: 'connexion', emoji: '🔄', nom: 'Rythme', prixCentimes: 1299, credits: 25, accroche: 'Utilisateur régulier', envKey: 'STRIPE_PRICE_PACK_CONNEXION' },
  { slug: 'eternite', emoji: '🌅', nom: 'Horizon', prixCentimes: 3499, credits: 100, accroche: 'Meilleur rapport volume', envKey: 'STRIPE_PRICE_PACK_ETERNITE' },
];

// Retiré : "Guidance" (400 crédits/mois, l'abonnement le plus cher et le
// moins susceptible de convertir) — un utilisateur à fort usage peut
// compléter son abonnement avec le pack "Horizon" plutôt que de choisir
// entre 3 formules mensuelles. Garde le schéma classique entrée + formule
// mise en avant, plus simple à comparer.
export const SUBSCRIPTIONS: Subscription[] = [
  { slug: 'essentiel', emoji: '⭐', nom: 'Horosphère', prixCentimesParMois: 999, creditsParMois: 80, avantage: 'Tarif préférentiel', envKey: 'STRIPE_PRICE_SUB_ESSENTIEL' },
  { slug: 'premium', emoji: '☀️', nom: 'Horosphère Suivi', prixCentimesParMois: 1999, creditsParMois: 200, avantage: 'Un accompagnement renforcé, au quotidien', envKey: 'STRIPE_PRICE_SUB_PREMIUM', misEnAvant: true },
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
  horoscope_quotidien: { nom: 'Horoscope du jour', description: "Une lecture courte chaque jour, et l'action à mener pour avancer.", disponible: true, categorie: 'lectures' },
  vision_hebdomadaire: { nom: 'Vision hebdomadaire', description: "Ce qui compte cette semaine, et comment vous organiser en conséquence.", disponible: true, categorie: 'lectures' },
  snapshot_natal: { nom: 'Snapshot Natal', description: "Un aperçu rapide de votre thème natal, et ce qu'il change pour vous.", disponible: true, categorie: 'lectures' },
  horoscope_personnalise: { nom: 'Horoscope personnalisé', description: "Basé sur votre date, heure et lieu de naissance — une action vraiment ajustée à vous.", disponible: true, categorie: 'lectures' },
  analyse_sentimentale: { nom: 'Analyse sentimentale', description: "Ce qui se joue dans votre vie affective cette semaine, et comment y répondre.", disponible: true, categorie: 'lectures' },
  compatibilite_amoureuse: { nom: 'Compatibilité amoureuse', description: "Ce qui fonctionne entre vous deux, et sur quoi travailler.", disponible: true, categorie: 'lectures' },
  theme_astral_complet: { nom: 'Thème astral complet', description: "Votre carte de naissance, pour comprendre vos leviers naturels et vous en servir.", disponible: true, categorie: 'lectures' },
  grande_analyse: { nom: 'Grande analyse personnalisée', description: "Un bilan complet, tous les axes de vie, avec une action à mener sur chacun.", disponible: true, categorie: 'lectures' },
  cycle_lunaire: { nom: 'Cycle lunaire', description: "Alignez vos actions sur les phases de la lune, semaine après semaine.", disponible: true, categorie: 'lectures', subscriptionOnly: true },
  transits_planetaires: { nom: 'Transits planétaires', description: "Ce que les mouvements planétaires du moment changent concrètement pour vous.", disponible: true, categorie: 'lectures', subscriptionOnly: true },
  horoscope_carriere: { nom: 'Horoscope carrière', description: "Ce qu'il faut décider ou ajuster côté carrière, éclairé par les astres.", disponible: true, categorie: 'guidance', subscriptionOnly: true },
  horoscope_amoureux: { nom: 'Horoscope amoureux', description: "Ce que ça implique pour votre vie sentimentale, et comment agir en conséquence.", disponible: true, categorie: 'guidance', subscriptionOnly: true },
  aide_decision: { nom: 'Aide à la décision', description: "Un éclairage astrologique pour trancher une décision importante.", disponible: true, categorie: 'guidance', subscriptionOnly: true },
  guidance_spirituelle: { nom: 'Guidance spirituelle', description: "Une lecture profonde, avec une pratique concrète pour avancer sur votre chemin intérieur.", disponible: true, categorie: 'guidance', subscriptionOnly: true },
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

// Prix d'un crédit (≈ le prix d'une lecture simple, qui coûte 1 crédit) pour
// un pack donné — mécaniquement dégressif : plus le pack est gros, moins le
// crédit coûte cher. Affiché sur /tarifs sous chaque pack.
export function prixParCredit(pack: CreditPack): string {
  return euros(pack.prixCentimes / pack.credits);
}

// Prix d'un crédit d'abonnement, ramené à la même unité que prixParCredit
// (packs) pour que les deux familles d'offres soient directement
// comparables sur /tarifs. Remplace l'ancien repère "prix par jour"
// (slogan historique "moins d'1€/jour") : retour utilisateur — afficher un
// prix par JOUR pour les abonnements et un prix par LECTURE pour les packs
// rendait la comparaison illisible, et laissait croire que l'abonnement le
// moins cher (moins de crédits/jour) était le plus avantageux alors que
// c'est l'inverse une fois ramené à la lecture.
export function prixParCreditAbonnement(sub: Subscription): string {
  return euros(sub.prixCentimesParMois / sub.creditsParMois);
}
