// Traduction d'affichage de la phase lunaire — même principe que
// zodiac-i18n.ts : une clé stable et indépendante de la langue (`PhaseKey`,
// dérivée des mêmes seuils que MoonPhase.phaseLabel) porte le nom et le
// texte d'influence dans chaque langue. Utilisé à la fois par l'UI
// (MoonOfTheDay, MoonPhase) et par la génération de contenu (anthropic.ts,
// pour que reading.phaseLabel soit dans la langue de la lecture, pas
// toujours en français).

export type PhaseKey =
  | 'new'
  | 'waxingCrescent'
  | 'firstQuarter'
  | 'waxingGibbous'
  | 'full'
  | 'waningGibbous'
  | 'lastQuarter'
  | 'waningCrescent';

export type MoonLocale = 'fr' | 'en' | 'es';

/** Même seuils que l'ancienne MoonPhase.phaseLabel — seule source de vérité
 * désormais pour la correspondance phase -> clé. */
export function phaseKey(phase: number): PhaseKey {
  if (phase < 0.03 || phase > 0.97) return 'new';
  if (phase < 0.22) return 'waxingCrescent';
  if (phase < 0.28) return 'firstQuarter';
  if (phase < 0.47) return 'waxingGibbous';
  if (phase < 0.53) return 'full';
  if (phase < 0.72) return 'waningGibbous';
  if (phase < 0.78) return 'lastQuarter';
  return 'waningCrescent';
}

const PHASE_LABELS: Record<MoonLocale, Record<PhaseKey, string>> = {
  fr: {
    new: 'Nouvelle lune',
    waxingCrescent: 'Premier croissant',
    firstQuarter: 'Premier quartier',
    waxingGibbous: 'Lune gibbeuse croissante',
    full: 'Pleine lune',
    waningGibbous: 'Lune gibbeuse décroissante',
    lastQuarter: 'Dernier quartier',
    waningCrescent: 'Dernier croissant',
  },
  en: {
    new: 'New moon',
    waxingCrescent: 'Waxing crescent',
    firstQuarter: 'First quarter',
    waxingGibbous: 'Waxing gibbous',
    full: 'Full moon',
    waningGibbous: 'Waning gibbous',
    lastQuarter: 'Last quarter',
    waningCrescent: 'Waning crescent',
  },
  es: {
    new: 'Luna nueva',
    waxingCrescent: 'Luna creciente',
    firstQuarter: 'Cuarto creciente',
    waxingGibbous: 'Gibosa creciente',
    full: 'Luna llena',
    waningGibbous: 'Gibosa menguante',
    lastQuarter: 'Cuarto menguante',
    waningCrescent: 'Luna menguante',
  },
};

const PHASE_INFLUENCES: Record<MoonLocale, Record<PhaseKey, string>> = {
  fr: {
    new: "Un ciel vierge, propice aux intentions neuves. C'est le bon moment pour poser une idée sur le papier plutôt que pour l'exécuter.",
    waxingCrescent: "L'élan démarre. Les premiers pas d'un projet demandent moins de certitude que de régularité — avancez sans attendre d'y voir clair.",
    firstQuarter: "Une tension utile s'installe : c'est le moment de trancher une décision que vous repoussez depuis plusieurs jours.",
    waxingGibbous: "L'énergie s'accumule. Affinez les détails de ce que vous avez lancé plutôt que d'ouvrir un nouveau chantier.",
    full: "Ce qui était en germe se révèle pleinement. Les émotions sont plus vives — observez-les avant d'agir sous leur coup.",
    waningGibbous: "Le moment du bilan. Gardez ce qui a fonctionné, laissez partir le reste sans vous y attarder.",
    lastQuarter: "Une phase de tri. Ce qui doit se clore se clôt plus facilement aujourd'hui — ne forcez pas ce qui résiste.",
    waningCrescent: "Le ciel se repose avant le renouveau. Ralentissez si vous le pouvez : la prochaine nouvelle lune n'attend pas d'être méritée.",
  },
  en: {
    new: "A blank sky, ripe for new intentions. It's a good time to put an idea on paper rather than act on it.",
    waxingCrescent: "The momentum begins. A project's first steps need steadiness more than certainty — move forward before it all becomes clear.",
    firstQuarter: "A useful tension sets in: it's time to settle a decision you've been putting off for days.",
    waxingGibbous: "Energy is building. Refine the details of what you've started rather than opening something new.",
    full: "What was brewing fully reveals itself. Emotions run higher — observe them before acting on impulse.",
    waningGibbous: "Time to take stock. Keep what worked, let the rest go without dwelling on it.",
    lastQuarter: "A sorting phase. What needs to end closes more easily today — don't force what resists.",
    waningCrescent: "The sky rests before renewal. Slow down if you can: the next new moon isn't in a hurry to be earned.",
  },
  es: {
    new: 'Un cielo en blanco, propicio para intenciones nuevas. Es un buen momento para poner una idea sobre el papel más que para ejecutarla.',
    waxingCrescent: 'El impulso arranca. Los primeros pasos de un proyecto piden más constancia que certeza — avanza sin esperar a verlo todo claro.',
    firstQuarter: 'Se instala una tensión útil: es el momento de zanjar una decisión que llevas días postergando.',
    waxingGibbous: 'La energía se acumula. Afina los detalles de lo que ya has puesto en marcha en vez de abrir un nuevo frente.',
    full: 'Lo que estaba gestándose se revela por completo. Las emociones están más a flor de piel — obsérvalas antes de actuar bajo su impulso.',
    waningGibbous: 'El momento del balance. Conserva lo que ha funcionado, deja ir el resto sin detenerte en ello.',
    lastQuarter: 'Una fase de selección. Lo que debe cerrarse se cierra hoy con más facilidad — no fuerces lo que resiste.',
    waningCrescent: 'El cielo descansa antes de renovarse. Baja el ritmo si puedes: la próxima luna nueva no espera ser merecida.',
  },
};

export function localizedPhaseLabel(phase: number, locale: string): string {
  const table = PHASE_LABELS[locale as MoonLocale] ?? PHASE_LABELS.fr;
  return table[phaseKey(phase)];
}

export function localizedPhaseInfluence(phase: number, locale: string): string {
  const table = PHASE_INFLUENCES[locale as MoonLocale] ?? PHASE_INFLUENCES.fr;
  return table[phaseKey(phase)];
}
