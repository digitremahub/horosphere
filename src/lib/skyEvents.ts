// Prochains événements astronomiques notables — calculés à la demande via
// astronomy-engine (aucun appel réseau, aucune API tierce). Utilisé par le
// compte à rebours de la page d'accueil.

import { EclipseKind, NextLunarEclipse, SearchGlobalSolarEclipse, SearchLunarEclipse, SearchMoonPhase } from 'astronomy-engine';

export type SkyEvent = {
  key: string;
  label: string;
  dateISO: string;
};

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
  if (fullMoon) events.push({ key: 'pleine-lune', label: 'Prochaine pleine lune', dateISO: fullMoon.date.toISOString() });
  if (newMoon) events.push({ key: 'nouvelle-lune', label: 'Prochaine nouvelle lune', dateISO: newMoon.date.toISOString() });
  events.push({ key: 'eclipse-lunaire', label: 'Prochaine éclipse lunaire', dateISO: lunarEclipse.toISOString() });
  events.push({ key: 'eclipse-solaire', label: 'Prochaine éclipse solaire', dateISO: solarEclipse.toISOString() });

  return events.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
}
