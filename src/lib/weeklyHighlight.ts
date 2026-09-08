// Récap astrologique structuré d'une semaine — transits majeurs, lunaisons
// (Nouvelle/Pleine Lune), et le "signe le plus impacté" de la semaine.
// Construit ENTIÈREMENT à partir de fonctions déjà existantes et validées
// dans le projet (voir lib/planets.ts, lib/natal.ts, lib/aspects.ts,
// lib/skyEvents.ts) — toutes reposent sur `astronomy-engine`, une
// bibliothèque de calcul astronomique réel (modèles orbitaux dérivés des
// éphémérides JPL, aucune approximation "IA", aucun appel réseau).
//
// Pourquoi pas la Swiss Ephemeris : Horosphère a déjà un moteur de calcul
// réel et précis (positions planétaires, ascendant, aspects, phases
// lunaires exactes via SearchMoonPhase) utilisé PARTOUT (horoscope
// personnalisé, thème natal, cycle lunaire, transits, actualité du ciel).
// Introduire un second moteur pour ce seul récap créerait un vrai risque :
// deux bibliothèques différentes pourraient donner des résultats
// légèrement différents pour la même date, rendant le contenu quotidien et
// le récap hebdomadaire incohérents entre eux. La précision d'astronomy-engine
// (validée à l'arcseconde pour l'ascendant, voir lib/natal.ts) est largement
// suffisante pour de l'astrologie au degré/signe près — aucun gain réel à
// attendre d'un changement de bibliothèque ici.

import { SearchMoonPhase } from 'astronomy-engine';
import { currentPlanetPositions, outerPlanetPositions, zodiacSignAt, type PlanetPosition } from './planets';
import { aspectsNatals, type AspectNatal } from './natal';

const UN_JOUR_MS = 86400000;

function toutesPositions(date: Date): PlanetPosition[] {
  return [...currentPlanetPositions(date), ...outerPlanetPositions(date)];
}

function joursDe(debut: Date, fin: Date): Date[] {
  const jours: Date[] = [];
  let cur = new Date(Date.UTC(debut.getUTCFullYear(), debut.getUTCMonth(), debut.getUTCDate()));
  const finJour = new Date(Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth(), fin.getUTCDate()));
  while (cur <= finJour) {
    jours.push(new Date(cur));
    cur = new Date(cur.getTime() + UN_JOUR_MS);
  }
  return jours;
}

export type ChangementDeSigne = { planete: string; ancienSigne: string; nouveauSigne: string; dateISO: string };
export type EvenementRetrograde = { planete: string; type: 'debut' | 'fin'; dateISO: string };
export type Lunaison = { type: 'nouvelle-lune' | 'pleine-lune'; dateISO: string; signe: string };

// La Lune change de signe tous les ~2,5 jours — jamais "notable" à l'échelle
// d'une semaine, contrairement à toutes les autres planètes.
const EXCLU_CHANGEMENT_SIGNE = new Set(['lune']);

/** Changements de signe détectés jour par jour dans la période (résolution
 * suffisante pour un récap hebdomadaire — on ne cherche pas l'instant exact
 * à la minute près, seulement le jour, comme dans l'exemple de script
 * fourni : "Le 11 septembre, une Nouvelle Lune en Vierge"). */
export function detecterChangementsDeSigne(debut: Date, fin: Date): ChangementDeSigne[] {
  const jours = joursDe(debut, fin);
  const resultats: ChangementDeSigne[] = [];
  let precedent: Record<string, string> | null = null;

  for (const jour of jours) {
    const positions = toutesPositions(jour).filter((p) => !EXCLU_CHANGEMENT_SIGNE.has(p.key));
    const signesDuJour: Record<string, string> = {};
    for (const p of positions) signesDuJour[p.key] = zodiacSignAt(p.longitude).nom;

    if (precedent) {
      for (const p of positions) {
        if (precedent[p.key] && precedent[p.key] !== signesDuJour[p.key]) {
          resultats.push({
            planete: p.nom,
            ancienSigne: precedent[p.key],
            nouveauSigne: signesDuJour[p.key],
            dateISO: jour.toISOString().slice(0, 10),
          });
        }
      }
    }
    precedent = signesDuJour;
  }
  return resultats;
}

/** Débuts/fins de rétrogradation détectés jour par jour — Soleil et Lune
 * exclus (jamais rétrogrades). */
export function detecterRetrogradations(debut: Date, fin: Date): EvenementRetrograde[] {
  const jours = joursDe(debut, fin);
  const resultats: EvenementRetrograde[] = [];
  let precedent: Record<string, boolean> | null = null;

  for (const jour of jours) {
    const positions = toutesPositions(jour).filter((p) => p.key !== 'soleil' && p.key !== 'lune');
    const etatDuJour: Record<string, boolean> = {};
    for (const p of positions) etatDuJour[p.key] = p.retrograde;

    if (precedent) {
      for (const p of positions) {
        if (precedent[p.key] !== undefined && precedent[p.key] !== etatDuJour[p.key]) {
          resultats.push({
            planete: p.nom,
            type: etatDuJour[p.key] ? 'debut' : 'fin',
            dateISO: jour.toISOString().slice(0, 10),
          });
        }
      }
    }
    precedent = etatDuJour;
  }
  return resultats;
}

/** Nouvelle(s)/Pleine(s) Lune(s) de la période — instant exact via
 * SearchMoonPhase (même fonction que lib/skyEvents.ts, la plus précise
 * disponible : recherche de l'angle Soleil-Lune exact, pas une
 * approximation de cycle moyen). */
export function detecterLunaisons(debut: Date, fin: Date): Lunaison[] {
  const resultats: Lunaison[] = [];
  const cibles: { angle: number; type: Lunaison['type'] }[] = [
    { angle: 0, type: 'nouvelle-lune' },
    { angle: 180, type: 'pleine-lune' },
  ];

  for (const { angle, type } of cibles) {
    let from = debut;
    for (let garde = 0; garde < 4; garde += 1) {
      const trouve = SearchMoonPhase(angle, from, 40);
      if (!trouve || trouve.date > fin) break;
      if (trouve.date >= debut) {
        const lune = currentPlanetPositions(trouve.date).find((p) => p.key === 'lune')!;
        resultats.push({ type, dateISO: trouve.date.toISOString(), signe: zodiacSignAt(lune.longitude).nom });
      }
      from = new Date(trouve.date.getTime() + UN_JOUR_MS);
    }
  }
  return resultats.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
}

/** Aspects majeurs entre planètes au milieu de la période — réutilise
 * aspectsNatals() (lib/natal.ts), déjà générique malgré son nom (elle
 * prend n'importe quel tableau de positions, pas seulement natales). */
export function aspectsMajeursDeLaSemaine(debut: Date, fin: Date): AspectNatal[] {
  const milieu = new Date((debut.getTime() + fin.getTime()) / 2);
  return aspectsNatals(toutesPositions(milieu));
}

export type SigneImpacte = { signe: string; raison: string };

const PLANETES_LENTES = new Set(['Jupiter', 'Saturne', 'Uranus', 'Neptune', 'Pluton']);

/** Règle de priorité pour le signe le plus impacté de la semaine :
 * 1. Nouvelle Lune (vrai point de départ symbolique)
 * 2. Pleine Lune (aboutissement)
 * 3. Changement de signe d'une planète lente (Jupiter à Pluton — rare, donc notable)
 * 4. Une rétrogradation qui démarre ou finit
 * `null` si rien de notable — le générateur de script peut alors retomber
 * sur le signe du Soleil du moment (soleilCycleActuel, lib/aspects.ts),
 * déjà utilisé par lib/skyNews.ts pour la même situation. */
function calculerSigneLePlusImpacte(
  lunaisons: Lunaison[],
  changements: ChangementDeSigne[],
  retrogradations: EvenementRetrograde[]
): SigneImpacte | null {
  const nouvelleLune = lunaisons.find((l) => l.type === 'nouvelle-lune');
  if (nouvelleLune) return { signe: nouvelleLune.signe, raison: `Nouvelle Lune du ${nouvelleLune.dateISO.slice(0, 10)}` };

  const pleineLune = lunaisons.find((l) => l.type === 'pleine-lune');
  if (pleineLune) return { signe: pleineLune.signe, raison: `Pleine Lune du ${pleineLune.dateISO.slice(0, 10)}` };

  const changementLent = changements.find((c) => PLANETES_LENTES.has(c.planete));
  if (changementLent) return { signe: changementLent.nouveauSigne, raison: `${changementLent.planete} entre en ${changementLent.nouveauSigne}` };

  if (retrogradations.length > 0) {
    const r = retrogradations[0];
    const positions = toutesPositions(new Date(`${r.dateISO}T12:00:00Z`));
    const planete = positions.find((p) => p.nom === r.planete);
    if (planete) {
      const signe = zodiacSignAt(planete.longitude).nom;
      const verbe = r.type === 'debut' ? 'entre en rétrogradation' : 'termine sa rétrogradation';
      return { signe, raison: `${r.planete} ${verbe}` };
    }
  }

  return null;
}

export type WeeklyHighlight = {
  periode: { debut: string; fin: string };
  lunaisons: Lunaison[];
  changementsDeSigne: ChangementDeSigne[];
  retrogradations: EvenementRetrograde[];
  aspectsMajeurs: AspectNatal[];
  signeLePlusImpacte: SigneImpacte | null;
};

/** Point d'entrée unique : tout ce qu'il faut savoir sur une semaine
 * donnée pour écrire le récap Elian/Lya, sous forme structurée (JSON),
 * directement injectable dans un prompt de génération de script. */
export function getWeeklyHighlight(dateDebutISO: string, dateFinISO: string): WeeklyHighlight {
  const debut = new Date(`${dateDebutISO}T00:00:00Z`);
  const fin = new Date(`${dateFinISO}T23:59:59Z`);

  const lunaisons = detecterLunaisons(debut, fin);
  const changementsDeSigne = detecterChangementsDeSigne(debut, fin);
  const retrogradations = detecterRetrogradations(debut, fin);
  const aspectsMajeurs = aspectsMajeursDeLaSemaine(debut, fin);
  const signeLePlusImpacte = calculerSigneLePlusImpacte(lunaisons, changementsDeSigne, retrogradations);

  return {
    periode: { debut: dateDebutISO, fin: dateFinISO },
    lunaisons,
    changementsDeSigne,
    retrogradations,
    aspectsMajeurs,
    signeLePlusImpacte,
  };
}
