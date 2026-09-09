import type { FeatureKey } from './pricing';

// Extrait court à partager sur les réseaux — jamais le contenu payant complet
// (paragraphes détaillés type "amour"/"conseil", réservés aux personnes
// inscrites), seulement l'accroche/le résumé/le titre déjà pensés courts
// dans chaque type de lecture (voir lib/anthropic.ts). Fonctionne aussi bien
// sur une lecture fraîchement générée (Dashboard) que sur une entrée de
// l'historique — même forme de JSON stockée par consumeCredits dans les deux
// cas.
type LooseReading = Record<string, unknown>;

export function extraitAPartager(feature: FeatureKey, data: LooseReading | null | undefined): string | null {
  if (!data) return null;
  if (feature === 'compatibilite_amoureuse' && typeof data.resume === 'string') {
    return `${data.resume} (${data.scoreGlobal}%)`;
  }
  if (typeof data.headline === 'string') return data.headline;
  if (typeof data.titre === 'string') return data.titre;
  if (typeof data.synthese === 'string') return data.synthese;
  if (typeof data.portrait === 'string') return data.portrait;
  return null;
}
