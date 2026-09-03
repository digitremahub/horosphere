// Configuration partagée des 6 lectures thématiques "simples" (même forme
// de contenu : titre/texte/point d'attention/conseil/score), pour éviter de
// dupliquer un prompt et une carte par thème. Utilisé par lib/anthropic.ts
// (prompt IA) et lib/fallback-generator.ts (banques de texte du mode démo).

export type ThemeKey =
  | 'vision_hebdomadaire'
  | 'snapshot_natal'
  | 'horoscope_carriere'
  | 'horoscope_amoureux'
  | 'aide_decision'
  | 'guidance_spirituelle';

export const THEMES: Record<ThemeKey, { titreCard: string; axe: string; consigne: string; portee: string }> = {
  vision_hebdomadaire: {
    titreCard: 'Vision de la semaine',
    axe: "une vue d'ensemble de la semaine à venir, tous domaines confondus",
    consigne: 'Donne une vision large : ce qui domine, un temps fort à anticiper, un point de vigilance.',
    portee: 'la semaine à venir',
  },
  snapshot_natal: {
    titreCard: 'Snapshot natal',
    axe: 'un résumé condensé du thème natal (signe solaire)',
    consigne: "Reste bref et dense : l'essentiel du thème, pas un thème complet détaillé.",
    portee: 'le thème natal',
  },
  horoscope_carriere: {
    titreCard: 'Horoscope carrière',
    axe: 'le chemin professionnel',
    consigne: 'Concentre-toi uniquement sur le travail, la carrière, les projets professionnels.',
    portee: 'la période actuelle',
  },
  horoscope_amoureux: {
    titreCard: 'Horoscope amoureux',
    axe: 'la vie sentimentale',
    consigne: 'Concentre-toi uniquement sur la vie amoureuse et sentimentale, en couple ou célibataire.',
    portee: 'la période actuelle',
  },
  aide_decision: {
    titreCard: 'Aide à la décision',
    axe: 'un choix important en cours',
    consigne: 'Aide à voir plus clair dans une décision à prendre, sans jamais décider à la place de la personne.',
    portee: 'le moment présent',
  },
  guidance_spirituelle: {
    titreCard: 'Guidance spirituelle',
    axe: "l'évolution intérieure et spirituelle",
    consigne: 'Reste inspirant et concret, jamais dogmatique ni rattaché à une religion précise.',
    portee: 'le cheminement intérieur',
  },
};
