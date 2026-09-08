// Script du récap hebdomadaire Elian/Lya — généré par IA à partir des
// faits réels de la semaine (lib/weeklyHighlight.ts, jamais inventés),
// dans l'un des 3 formats définis (voir README, section Elian & Lya) :
// classique (Elian ouvre, Lya conclut), intention (Lya ouvre, Elian
// complète) ou tension (léger désaccord puis résolution) — choisi selon
// la nature du transit dominant de la semaine, jamais arbitrairement.

import { callClaude } from './anthropic';
import type { WeeklyHighlight } from './weeklyHighlight';

export type ScenePersona = { persona: 'elian' | 'lya'; texte: string };
export type FormatRecap = 'classique' | 'intention' | 'tension';

const PLANETES_ACTION = new Set(['Mars', 'Soleil']);
const ASPECTS_TENDUS = new Set(['carré', 'opposition']);
const ASPECTS_DOUX = new Set(['conjonction', 'trigone', 'sextile']);

/** Format "tension" à garder occasionnel (voir README) même quand un
 * aspect tendu ou une rétrogradation démarrante le rendrait éligible —
 * d'où le tirage aléatoire qui limite son usage plutôt que de le
 * déclencher systématiquement. */
function choisirFormat(highlight: WeeklyHighlight): FormatRecap {
  const uneRetrogradationDemarre = highlight.retrogradations.some((r) => r.type === 'debut');
  const aspectTendu = highlight.aspectsMajeurs.some((a) => ASPECTS_TENDUS.has(a.aspect));
  const aspectAction = highlight.aspectsMajeurs.some(
    (a) => ASPECTS_DOUX.has(a.aspect) && (PLANETES_ACTION.has(a.corps1) || PLANETES_ACTION.has(a.corps2))
  );

  if ((uneRetrogradationDemarre || aspectTendu) && Math.random() < 0.4) return 'tension';
  if (aspectAction) return 'intention';
  return 'classique';
}

const STRUCTURE_FORMAT: Record<FormatRecap, string> = {
  classique: "Format \"classique\" : Elian ouvre en expliquant la cohérence du ciel, Lya conclut en donnant l'action concrète.",
  intention: "Format \"intention\" : Lya ouvre directement sur l'action à mener cette semaine, Elian complète ensuite en expliquant pourquoi le ciel le confirme.",
  tension: "Format \"tension\" : Elian et Lya expriment d'abord un léger désaccord de point de vue (Elian prudent et analytique, Lya impatiente et orientée action), puis se rejoignent et se résolvent en fin de script.",
};

function resumerFaits(highlight: WeeklyHighlight): string {
  const lignes: string[] = [];
  for (const l of highlight.lunaisons) {
    lignes.push(`${l.type === 'nouvelle-lune' ? 'Nouvelle Lune' : 'Pleine Lune'} le ${l.dateISO.slice(0, 10)} en ${l.signe}.`);
  }
  for (const c of highlight.changementsDeSigne) {
    lignes.push(`${c.planete} passe de ${c.ancienSigne} à ${c.nouveauSigne} le ${c.dateISO}.`);
  }
  for (const r of highlight.retrogradations) {
    lignes.push(`${r.planete} ${r.type === 'debut' ? 'entre en rétrogradation' : 'termine sa rétrogradation'} le ${r.dateISO}.`);
  }
  const aspectsTries = [...highlight.aspectsMajeurs].sort((a, b) => a.orbe - b.orbe).slice(0, 3);
  for (const a of aspectsTries) {
    lignes.push(`${a.corps1} en ${a.aspect} avec ${a.corps2} (orbe ${a.orbe}°).`);
  }
  return lignes.length > 0 ? lignes.join('\n') : "Semaine sans transit majeur particulier — rester sur des repères plus généraux (phase lunaire, énergie du moment).";
}

// Signature de marque, identique chaque semaine (voir note de production
// de l'utilisateur, 08/09) — fixée en dur plutôt que confiée à l'IA, pour
// ne jamais dériver d'une semaine à l'autre.
const SCENES_CLOTURE: ScenePersona[] = [
  { persona: 'elian', texte: 'Le ciel donne le cadre.' },
  { persona: 'lya', texte: 'Toi, tu donnes le résultat. À la semaine prochaine, sur Horosphère.' },
];

function scriptDeSecours(highlight: WeeklyHighlight): ScenePersona[] {
  const faits = resumerFaits(highlight);
  return [
    { persona: 'elian', texte: 'Cette semaine, le ciel a plusieurs choses à nous dire.' },
    { persona: 'lya', texte: faits.split('\n')[0] },
    ...SCENES_CLOTURE,
  ];
}

/** Génère le script complet (répliques Elian/Lya + clôture rituelle fixe)
 * à partir des faits réels d'une semaine — jamais d'invention : l'IA ne
 * reçoit que ce que weeklyHighlight.ts a calculé, et la consigne de ne
 * jamais en ajouter. Repli déterministe minimal si ANTHROPIC_API_KEY est
 * absente ou que l'appel échoue (toujours un script exploitable). */
export async function genererScriptRecapHebdo(
  highlight: WeeklyHighlight
): Promise<{ format: FormatRecap; scenes: ScenePersona[] }> {
  const format = choisirFormat(highlight);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { format, scenes: scriptDeSecours(highlight) };

  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
  const faits = resumerFaits(highlight);
  const impact = highlight.signeLePlusImpacte;

  const prompt = `Tu écris le script du récap hebdomadaire vidéo Horosphère, porté par deux personas fixes :
- Elian, la voix de l'astro : explique la cohérence du ciel (le pourquoi cosmique), ton pédagogue et posé.
- Lya, la voix de l'action : transforme la lecture d'Elian en décision concrète, ton direct et énergique.

${STRUCTURE_FORMAT[format]}

Faits réels de la semaine (calculés astronomiquement — ne jamais en inventer d'autres, ne jamais changer une date ou un signe) :
${faits}
${impact ? `Signe le plus impacté cette semaine : ${impact.signe} (${impact.raison}).` : ''}

Consignes :
- 6 à 8 répliques au total, courtes (1 à 3 phrases chacune), qui alternent entre Elian et Lya selon le format demandé ci-dessus.
- Commence par le fait le plus marquant de la semaine${impact ? ` (${impact.raison})` : ''}.
- Ne mentionne pas plus de 2 à 3 faits au total parmi ceux donnés — l'objectif est l'impact global de la semaine, pas un cours d'astrologie complet.
${impact ? `- Une réplique doit s'adresser directement aux personnes nées sous le signe ${impact.signe}, sans que ça prenne toute la vidéo.` : ''}
- Termine par une action concrète de la semaine, formulée par Lya, valable pour tout le monde (pas seulement le signe le plus impacté).
- N'ajoute PAS de phrase de clôture générale du type "à la semaine prochaine" — elle est ajoutée automatiquement après ton texte.
- Ton : jamais fataliste, jamais de vocabulaire mystique appuyé — cohérence et action, conforme au positionnement Horosphère. Réponds intégralement en français, sans aucun mot anglais.

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :
{"scenes": [{"persona": "elian ou lya", "texte": "..."}]}`;

  try {
    const parsed = await callClaude(apiKey, model, prompt, 1200);
    const scenes = Array.isArray(parsed?.scenes)
      ? parsed.scenes.filter(
          (s: any) => (s?.persona === 'elian' || s?.persona === 'lya') && typeof s?.texte === 'string' && s.texte.trim()
        )
      : [];
    if (scenes.length === 0) throw new Error('Réponse IA sans scène exploitable.');
    return { format, scenes: [...scenes, ...SCENES_CLOTURE] };
  } catch (err) {
    console.error('genererScriptRecapHebdo: appel IA échoué, repli minimal', err);
    return { format, scenes: scriptDeSecours(highlight) };
  }
}
