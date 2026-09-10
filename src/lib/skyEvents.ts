// Prochains événements astronomiques notables — calculés à la demande via
// astronomy-engine (aucun appel réseau, aucune API tierce). Utilisé par le
// compte à rebours de la page d'accueil.

import { Body, Ecliptic, EclipseKind, GeoVector, NextLunarEclipse, SearchGlobalSolarEclipse, SearchLunarEclipse, SearchMoonPhase } from 'astronomy-engine';
import { zodiacSignAt } from './planets';

export type SkyEvent = {
  key: string;
  label: string;
  dateISO: string;
  // Signe occupé par la Lune au moment précis de l'événement (les 4 types
  // ici tombent tous à une nouvelle ou pleine lune — Soleil et Lune
  // conjoints ou opposés — donc le signe de la Lune définit l'événement
  // dans les deux cas). Sert à personnaliser l'impact par signe, voir
  // lib/skyEventsPersonnels.ts.
  signeKey: string;
};

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function signeDeLEvenement(date: Date): string {
  const lon = normalizeDeg(Ecliptic(GeoVector(Body.Moon, date, true)).elon);
  return zodiacSignAt(lon).key;
}

const MAX_LOOKAHEAD_ITERATIONS = 12;

/** Les éclipses lunaires pénombrales sont quasi invisibles à l'œil nu — on
 * cherche la prochaine éclipse au moins partielle pour rester pertinent. */
function nextNoticeableLunarEclipseDate(from: Date): Date {
  let info = SearchLunarEclipse(from);
  let guard = 0;
  while (info.kind === EclipseKind.Penumbral && guard < MAX_LOOKAHEAD_ITERATIONS) {
    info = NextLunarEclipse(info.peak);
    guard += 1;
  }
  return info.peak.date;
}

/** Prochaine pleine lune, nouvelle lune, éclipse lunaire et éclipse solaire,
 * triées par date la plus proche. */
export function getUpcomingSkyEvents(from: Date = new Date()): SkyEvent[] {
  const fullMoon = SearchMoonPhase(180, from, 40);
  const newMoon = SearchMoonPhase(0, from, 40);
  const lunarEclipse = nextNoticeableLunarEclipseDate(from);
  const solarEclipse = SearchGlobalSolarEclipse(from).peak.date;

  const events: SkyEvent[] = [];
  if (fullMoon) events.push({ key: 'pleine-lune', label: 'Prochaine pleine lune', dateISO: fullMoon.date.toISOString(), signeKey: signeDeLEvenement(fullMoon.date) });
  if (newMoon) events.push({ key: 'nouvelle-lune', label: 'Prochaine nouvelle lune', dateISO: newMoon.date.toISOString(), signeKey: signeDeLEvenement(newMoon.date) });
  events.push({ key: 'eclipse-lunaire', label: 'Prochaine éclipse lunaire', dateISO: lunarEclipse.toISOString(), signeKey: signeDeLEvenement(lunarEclipse) });
  events.push({ key: 'eclipse-solaire', label: 'Prochaine éclipse solaire', dateISO: solarEclipse.toISOString(), signeKey: signeDeLEvenement(solarEclipse) });

  return events.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
}
