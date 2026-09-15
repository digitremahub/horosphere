// Triade de mots-clés par signe — bannière tournante affichée sur chaque
// slide du carrousel Instagram/Facebook quotidien. Reprend EXACTEMENT les
// triades validées lors de la construction manuelle des 12 modèles Canva
// "{Signe} - Horosphère Instagram" (édition de lancement du 14/09/2026) —
// jamais réinventées, pour rester cohérent avec ce qui a déjà été
// publié/vu par les abonnés. N'est plus consommé par du code (les visuels
// sont désormais exclusivement Canva, jamais composés en code — décision du
// 15/09) : sert de référence lors de la préparation manuelle d'un nouveau
// modèle Canva (ex. un signe dont le modèle manquait encore).
import type { Sign } from './zodiac';

export const TRIADE_SIGNE: Record<Sign['key'], string> = {
  belier: 'INITIATIVE - COURAGE - ACTION',
  taureau: 'STABILITÉ - PERSÉVÉRANCE - CONCRÉTISATION',
  gemeaux: 'CURIOSITÉ - ADAPTATION - COMMUNICATION',
  cancer: 'SENSIBILITÉ - INTUITION - PROTECTION',
  lion: 'CONFIANCE - GÉNÉROSITÉ - RAYONNEMENT',
  vierge: 'ANALYSE - ORGANISATION - PROGRESSION',
  balance: 'HARMONIE - DIPLOMATIE - ÉQUILIBRE',
  scorpion: 'TRANSFORMATION - PUISSANCE - RÉSILIENCE',
  sagittaire: 'LIBERTÉ - OPTIMISME - EXPANSION',
  capricorne: 'AMBITION - DISCIPLINE - PERSÉVÉRANCE',
  verseau: 'ORIGINALITÉ - INDÉPENDANCE - VISION',
  poissons: 'INTUITION - SENSIBILITÉ - IMAGINATION',
};
