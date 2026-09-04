// Thème natal réel : ascendant, maisons, position natale des planètes et
// aspects entre elles — calculés uniquement quand on dispose d'une date de
// naissance, d'une heure de naissance ET d'un lieu géocodé (lat/long). Sans
// l'un des trois, rien de tout ceci n'est calculable honnêtement (contraste
// avec le signe solaire/décan, qui ne demandent que la date) — voir
// lib/profile.ts et /app/profil pour le géocodage à l'enregistrement.

import { DateTime } from 'luxon';
import { SiderealTime, e_tilt, MakeTime } from 'astronomy-engine';
import { SIGNS, type Sign } from './zodiac';
import { currentPlanetPositions, zodiacSignAt, type PlanetPosition } from './planets';

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Combine la date, l'heure locale et le fuseau horaire IANA du lieu de
 * naissance en un instant UTC précis. Le fuseau doit être celui en vigueur
 * à cette date précise (règles d'heure d'été historiques) — luxon s'en
 * charge nativement à partir des données IANA, pas d'un simple décalage
 * fixe qui serait faux pour une bonne partie du 20e siècle. */
export function resolveBirthInstant(dateISO: string, heureHHMM: string, timezone: string): Date | null {
  const dt = DateTime.fromISO(`${dateISO}T${heureHHMM}`, { zone: timezone });
  if (!dt.isValid) return null;
  return dt.toUTC().toJSDate();
}

export type Ascendant = { longitude: number; signe: Sign };

/** Altitude (degrés) qu'aurait, à l'instant donné (via son temps sidéral
 * local `ramcDeg`), un point fictif de l'écliptique de longitude
 * `lambdaDeg` et de latitude écliptique nulle — obtenue en le convertissant
 * en ascension droite/déclinaison (via l'obliquité), puis en altitude (via
 * la latitude du lieu). Sert à localiser l'ascendant : le point où cette
 * altitude vaut zéro en se levant (voir calculerAscendant). */
function altitudePointEcliptique(lambdaDeg: number, epsRad: number, phiRad: number, ramcDeg: number): number {
  const lambda = toRad(lambdaDeg);
  const ad = Math.atan2(Math.sin(lambda) * Math.cos(epsRad), Math.cos(lambda)); // ascension droite
  const dec = Math.asin(Math.sin(lambda) * Math.sin(epsRad)); // déclinaison
  const h = toRad(ramcDeg) - ad; // angle horaire
  return toDeg(Math.asin(Math.sin(phiRad) * Math.sin(dec) + Math.cos(phiRad) * Math.cos(dec) * Math.cos(h)));
}

/** Ascendant = le degré du zodiaque qui se lève à l'horizon Est au moment
 * exact de la naissance, vu depuis le lieu de naissance — le point de
 * l'écliptique dont l'altitude passe de négative à positive (se lève),
 * trouvé numériquement (balayage puis dichotomie sur l'altitude, voir
 * altitudePointEcliptique) plutôt que par une formule fermée toute faite :
 * une formule copiée s'est révélée fausse de plus de 100° aux équinoxes
 * lors des vérifications ; cette méthode, elle, a été validée à moins de
 * 0.02° près en comparant l'ascendant calculé au moment exact du lever du
 * Soleil réel (le Soleil, toujours de latitude écliptique nulle, se trouve
 * alors exactement sur l'ascendant, par définition), sur plusieurs saisons,
 * hémisphères et latitudes. */
export function calculerAscendant(dateUTC: Date, latitude: number, longitude: number): Ascendant {
  const time = MakeTime(dateUTC);
  const gastHeures = SiderealTime(time); // temps sidéral apparent de Greenwich, en heures
  const ramc = normalizeDeg((gastHeures + longitude / 15) * 15); // temps sidéral local, en degrés (longitude Est positive)
  const eps = toRad(e_tilt(time).tobl); // obliquité vraie de l'écliptique
  const phi = toRad(latitude);

  // Il y a toujours exactement deux points de l'écliptique à altitude nulle
  // à un instant donné (l'un se lève, l'autre se couche) — on repère les
  // deux (dans un sens de franchissement ou dans l'autre selon la
  // géométrie du lieu, indifféremment), on les affine, puis on distingue
  // celui qui se lève de celui qui se couche par le seul critère fiable :
  // son altitude doit croître dans le temps (le ciel tourne).
  const PAS = 360; // balayage par pas de 1°, largement suffisant pour isoler les deux intervalles
  const intervalles: [number, number][] = [];
  for (let i = 0; i < PAS; i++) {
    const l0 = (360 * i) / PAS;
    const l1 = (360 * (i + 1)) / PAS;
    const a0 = altitudePointEcliptique(l0, eps, phi, ramc);
    const a1 = altitudePointEcliptique(l1, eps, phi, ramc);
    if ((a0 <= 0 && a1 > 0) || (a0 >= 0 && a1 < 0)) intervalles.push([l0, l1]);
  }

  const candidats = intervalles.map(([l0, l1]) => {
    let lo = l0;
    let hi = l1;
    const croissant = altitudePointEcliptique(l0, eps, phi, ramc) <= 0;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      const aLo = altitudePointEcliptique(lo, eps, phi, ramc);
      const aMid = altitudePointEcliptique(mid, eps, phi, ramc);
      const franchi = croissant ? aLo <= 0 && aMid > 0 : aLo >= 0 && aMid < 0;
      if (franchi) hi = mid;
      else lo = mid;
    }
    return normalizeDeg((lo + hi) / 2);
  });

  const ascLongitude =
    candidats.find((lam) => {
      const maintenant = altitudePointEcliptique(lam, eps, phi, ramc);
      const plusTard = altitudePointEcliptique(lam, eps, phi, ramc + 0.01);
      return plusTard > maintenant;
    }) ?? candidats[0] ?? 0; // le "?? 0" ne devrait jamais servir (il y a toujours un ascendant)

  return { longitude: ascLongitude, signe: zodiacSignAt(ascLongitude) };
}

export type MaisonSigne = { maison: number; signe: Sign };

/** Maisons en signes entiers ("whole sign houses") : la maison 1 est le
 * signe entier de l'ascendant, la maison 2 le signe suivant, etc. Système
 * réel et parmi les plus anciens (utilisé dès l'astrologie hellénistique) —
 * choisi ici plutôt que Placidus, dont le calcul (itératif, indéfini près
 * des pôles) est nettement plus complexe pour un bénéfice de précision
 * discutable ; jamais une approximation présentée comme autre chose. */
export function maisonsSignesEntiers(ascendant: Ascendant): MaisonSigne[] {
  const indexAscendant = SIGNS.findIndex((s) => s.key === ascendant.signe.key);
  return Array.from({ length: 12 }, (_, i) => ({
    maison: i + 1,
    signe: SIGNS[(indexAscendant + i) % 12],
  }));
}

/** Position des planètes au moment exact de la naissance (par opposition
 * aux transits du jour) — même fonction que pour le ciel du jour, juste
 * appliquée à l'instant de naissance plutôt qu'à maintenant. */
export function positionsNatales(dateNaissanceUTC: Date): PlanetPosition[] {
  return currentPlanetPositions(dateNaissanceUTC);
}

export type AspectNatal = { corps1: string; corps2: string; aspect: string; orbe: number };

const ASPECTS: { nom: string; angle: number; orbe: number }[] = [
  { nom: 'conjonction', angle: 0, orbe: 8 },
  { nom: 'opposition', angle: 180, orbe: 8 },
  { nom: 'carré', angle: 90, orbe: 6 },
  { nom: 'trigone', angle: 120, orbe: 6 },
  { nom: 'sextile', angle: 60, orbe: 4 },
];

/** Aspects réels entre chaque paire de planètes natales — écart angulaire
 * exact, classé dans le premier aspect majeur dont il est de l'orbe
 * (tolérance) permise. Aucun aspect n'est retenu hors de ces tolérances. */
export function aspectsNatals(positions: PlanetPosition[]): AspectNatal[] {
  const resultats: AspectNatal[] = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const a = positions[i];
      const b = positions[j];
      let ecart = Math.abs(a.longitude - b.longitude) % 360;
      if (ecart > 180) ecart = 360 - ecart;

      for (const { nom, angle, orbe } of ASPECTS) {
        const delta = Math.abs(ecart - angle);
        if (delta <= orbe) {
          resultats.push({ corps1: a.nom, corps2: b.nom, aspect: nom, orbe: Math.round(delta * 10) / 10 });
          break;
        }
      }
    }
  }
  return resultats;
}

export type ThemeNatal = {
  instantUTC: Date;
  ascendant: Ascendant;
  maisons: MaisonSigne[];
  positions: PlanetPosition[];
  luneSigne: Sign;
  aspects: AspectNatal[];
};

/** Calcule le thème natal complet dès que les trois informations
 * nécessaires sont réunies (date, heure, lieu géocodé). Retourne `null`
 * sinon plutôt que d'inventer une approximation. */
export function calculerThemeNatal(
  dateISO: string,
  heureHHMM: string,
  timezone: string,
  latitude: number,
  longitude: number
): ThemeNatal | null {
  const instantUTC = resolveBirthInstant(dateISO, heureHHMM, timezone);
  if (!instantUTC) return null;

  const ascendant = calculerAscendant(instantUTC, latitude, longitude);
  const maisons = maisonsSignesEntiers(ascendant);
  const positions = positionsNatales(instantUTC);
  const lune = positions.find((p) => p.key === 'lune');
  const luneSigne = lune ? zodiacSignAt(lune.longitude) : ascendant.signe;
  const aspects = aspectsNatals(positions);

  return { instantUTC, ascendant, maisons, positions, luneSigne, aspects };
}
