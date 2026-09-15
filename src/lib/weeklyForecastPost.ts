// Post "Prévisions de la semaine" — carrousel Instagram + Facebook publié
// chaque lundi matin (9h, même rythme que la newsletter hebdomadaire),
// demande explicite de l'utilisateur (14/09) : un post dédié aux tendances
// de la semaine, distinct des carrousels quotidiens par signe. Contenu basé
// sur getWeeklyHighlight() (lib/weeklyHighlight.ts) — les mêmes données
// astronomiques réelles (astronomy-engine) déjà utilisées pour le script du
// récap vidéo du dimanche (lib/reels.ts) : jamais deux sources différentes
// pour un même type d'information.
//
// Comme les carrousels quotidiens par signe, le VRAI visuel publié est
// EXCLUSIVEMENT un export Canva mis à jour manuellement à chaque
// publication — plus aucun rendu de prévisualisation généré en code depuis
// la demande explicite de l'utilisateur (15/09 : "supprime tous les
// visuels que tu dois créer dans le code, n'utilise que les visuels
// Canva"), qui avait déjà valu un incident (un visuel de secours resté en
// place au lieu du vrai export Canva).

import { callClaude } from './anthropic';
import { getWeeklyHighlight, type WeeklyHighlight } from './weeklyHighlight';
import { mulberry32, hashStr } from './fallback-generator';

const HASHTAGS_SEMAINE = '#horoscope #astrologie #horosphere #previsionsdelasemaine #developpementpersonnel';

/** Lundi (00:00 UTC) et dimanche (23:59:59 UTC) de la semaine ISO contenant
 * `date` — même convention que lundiDeLaSemaineUTC dans lib/social.ts
 * (semaine lundi-dimanche), dupliquée ici en version simple (date ISO
 * seulement) pour ne pas créer de dépendance croisée entre les deux fichiers
 * pour une seule fonction utilitaire. */
function semaineISO(date: Date): { debutISO: string; finISO: string } {
  const jour = date.getUTCDay(); // 0 = dimanche ... 6 = samedi
  const decalage = jour === 0 ? 6 : jour - 1;
  const debut = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  debut.setUTCDate(debut.getUTCDate() - decalage);
  const fin = new Date(debut);
  fin.setUTCDate(fin.getUTCDate() + 6);
  return { debutISO: debut.toISOString().slice(0, 10), finISO: fin.toISOString().slice(0, 10) };
}

function formatDateCourte(dateISO: string): string {
  return new Date(`${dateISO}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

export type PageTexte = { titre: string; corps: string };

export type PrevisionSemaine = {
  periode: { debut: string; fin: string; label: string };
  legende: string;
  hashtags: string;
  pages: [PageTexte, PageTexte, PageTexte, PageTexte]; // Lunaisons, Mouvements planétaires, Signe le plus impacté, Action de la semaine
  mode: 'ia' | 'demo';
};

function labelLunaisons(highlight: WeeklyHighlight): string {
  if (highlight.lunaisons.length === 0) return "Pas de nouvelle ou pleine lune cette semaine — une semaine de continuité, sans grand seuil symbolique. C'est le moment de poursuivre ce qui est déjà en mouvement plutôt que d'attendre un signal extérieur.";
  return highlight.lunaisons
    .map((l) => {
      const type = l.type === 'nouvelle-lune' ? 'Nouvelle Lune' : 'Pleine Lune';
      const jour = formatDateCourte(l.dateISO.slice(0, 10));
      const sens = l.type === 'nouvelle-lune'
        ? `un vrai point de départ : posez une intention claire, même petite.`
        : `un aboutissement : ce qui a mûri ces deux dernières semaines arrive à son terme.`;
      return `${type} en ${l.signe} le ${jour} — ${sens}`;
    })
    .join('\n\n');
}

function labelMouvements(highlight: WeeklyHighlight): string {
  const lignes: string[] = [];
  for (const c of highlight.changementsDeSigne) {
    lignes.push(`${c.planete} entre en ${c.nouveauSigne} (${formatDateCourte(c.dateISO)}) — un changement de ton qui se ressent sur plusieurs semaines, pas juste aujourd'hui.`);
  }
  for (const r of highlight.retrogradations) {
    const verbe = r.type === 'debut' ? 'entre en rétrogradation' : 'termine sa rétrogradation';
    lignes.push(`${r.planete} ${verbe} (${formatDateCourte(r.dateISO)}).`);
  }
  if (lignes.length === 0) return "Aucun mouvement planétaire majeur cette semaine — le ciel reste stable, une semaine propice pour consolider sans être bousculé par un changement de rythme extérieur.";
  return lignes.join('\n\n');
}

function labelSigneImpacte(highlight: WeeklyHighlight): PageTexte {
  if (!highlight.signeLePlusImpacte) {
    return {
      titre: 'SEMAINE ÉQUILIBRÉE',
      corps: "Aucun signe ne concentre l'attention cette semaine plus qu'un autre — une semaine où chacun avance à son rythme, sans pression collective particulière.",
    };
  }
  return {
    titre: `${highlight.signeLePlusImpacte.signe.toUpperCase()} SOUS PROJECTEUR`,
    corps: `${highlight.signeLePlusImpacte.raison} — ce signe est particulièrement concerné cette semaine, mais l'influence se ressent aussi, à un degré moindre, pour tout le monde selon sa position natale.`,
  };
}

const ACTIONS_DEMO = [
  "Cette semaine, avancez sur UNE seule priorité plutôt que de disperser votre énergie sur dix fronts.",
  "Prenez le temps, cette semaine, de clore une chose en suspens avant d'en commencer une nouvelle.",
  "Cette semaine invite à l'écoute plus qu'à l'action : observez avant de trancher.",
];

/** Construit le contenu du carrousel hebdomadaire (4 diapositives + couverture
 * implicite, comme les carrousels quotidiens : la couverture ne porte que la
 * période, pas de texte de contenu). Toujours un repli déterministe (aucune
 * clé Anthropic requise) — même principe que le reste du pipeline social. */
export async function genererPrevisionSemaine(date: Date = new Date()): Promise<PrevisionSemaine> {
  const { debutISO, finISO } = semaineISO(date);
  const highlight = getWeeklyHighlight(debutISO, finISO);
  const label = `${formatDateCourte(debutISO)} – ${formatDateCourte(finISO)}`;

  const lunaisons = labelLunaisons(highlight);
  const mouvements = labelMouvements(highlight);
  const signeImpacte = labelSigneImpacte(highlight);

  let action: string;
  let mode: 'ia' | 'demo' = 'demo';
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
      const prompt = `Tu es le community manager d'Horosphère. Voici les faits astronomiques réels de la semaine du ${label} : ${JSON.stringify(highlight)}. Écris UNE phrase d'action concrète (25 mots maximum) à proposer pour cette semaine, cohérente avec ces faits (pas de généralité vague). Ton direct, jamais fataliste. Réponds UNIQUEMENT avec un objet JSON {"action": "..."}.`;
      const parsed = await callClaude(apiKey, model, prompt, 200);
      if (typeof parsed?.action === 'string' && parsed.action.trim()) {
        action = parsed.action.trim();
        mode = 'ia';
      } else {
        throw new Error('réponse IA vide');
      }
    } catch (err) {
      console.error('genererPrevisionSemaine: appel IA échoué, repli démo', err);
      const rng = mulberry32(hashStr('prevision-semaine::' + debutISO));
      action = ACTIONS_DEMO[Math.floor(rng() * ACTIONS_DEMO.length)];
    }
  } else {
    const rng = mulberry32(hashStr('prevision-semaine::' + debutISO));
    action = ACTIONS_DEMO[Math.floor(rng() * ACTIONS_DEMO.length)];
  }

  const legende = [
    `🔮 Prévisions de la semaine — ${label}`,
    '',
    `🌙 ${lunaisons.split('\n\n')[0]}`,
    `🪐 ${mouvements.split('\n\n')[0]}`,
    `✨ ${signeImpacte.titre} : ${signeImpacte.corps}`,
    '',
    `Action de la semaine : ${action}`,
    '',
    `Chaque semaine, Horosphère décrypte le ciel pour vous — découvrez votre lecture complète sur horosphere.fr.`,
  ].join('\n');

  return {
    periode: { debut: debutISO, fin: finISO, label },
    legende,
    hashtags: HASHTAGS_SEMAINE,
    pages: [
      { titre: 'LUNAISONS', corps: lunaisons },
      { titre: 'MOUVEMENTS PLANÉTAIRES', corps: mouvements },
      signeImpacte,
      { titre: 'ACTION DE LA SEMAINE', corps: action },
    ],
    mode,
  };
}
