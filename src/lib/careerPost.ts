// Post "Ton métier selon ton signe" — 1re des nouvelles catégories de
// contenu demandées par l'utilisateur (14/09 : "Je veux d'autres catégories
// aussi : 'ton métier selon ton signe', 'Tes relations selon les autres
// signes', ... pour avoir vraiment du contenu constant"). S'AJOUTE aux
// carrousels quotidiens existants (3e post, pas un remplacement).
//
// Format revu suite à un retour explicite de l'utilisateur (15/09) : "en
// reprends pas la même chose que dans un autre post, ça va être évalué sur
// la qualité, les gens vont s'en rendre compte" — la 1re version (un signe
// par jour, exactement la même structure que le carrousel quotidien)
// dupliquait le format existant. Nouvelle structure, VOLONTAIREMENT
// différente : un seul post couvre LES 12 SIGNES À LA FOIS (un carrousel de
// couverture + 3 pages, 4 signes par page, regroupés par qualité
// astrologique — cardinaux/fixes/mutables), publié tous les 2-3 jours (voir
// PROCHAINE_PUBLICATION ci-dessous) plutôt que chaque jour pour un seul
// signe. Deux bénéfices explicitement demandés : moins de production (un
// seul appel IA groupé pour les 12 signes au lieu d'un par jour) et un
// format qui ne ressemble pas au carrousel quotidien par signe (pas de photo
// de signe en fond, pas de triade, pas de découpage amour/travail/énergie).
//
// Comme les autres formats sociaux, le VRAI visuel publié est un export
// Canva mis à jour manuellement à chaque publication (voir
// api/og/carrousel-metier/route.tsx pour le rendu de secours/prévisualisation
// uniquement) — jamais le rendu code utilisé tel quel pour la publication
// réelle (règle absolue posée par l'utilisateur le 13/09).

import { SIGNS, type Sign } from './zodiac';
import { callClaude } from './anthropic';
import { mulberry32, hashStr } from './fallback-generator';

const HASHTAGS_METIER = '#horoscope #astrologie #horosphere #carriere #developpementpersonnel';

// Rythme de publication : tous les 2-3 jours (lundi / mercredi / vendredi,
// jours UTC 1/3/5) — décision explicite de l'utilisateur ("ça réduit les
// coûts de production et ça maintient un rythme quand même") plutôt qu'un
// post quotidien par signe. Le scénario Make est planifié directement sur
// ces 3 jours ; cette liste sert ici uniquement à calculer la période
// couverte par chaque publication (voir periodeCouverte ci-dessous).
const JOURS_PUBLICATION_UTC = [1, 3, 5];

/** Période couverte par la publication faite le jour `date` (doit être l'un
 * des JOURS_PUBLICATION_UTC) : de `date` jusqu'à la veille de la prochaine
 * publication — 2 jours (lundi→mercredi, mercredi→vendredi) ou 3 jours
 * (vendredi→lundi suivant), jamais fixe, exactement le rythme "tous les
 * 2/3 jours" demandé. */
function periodeCouverte(date: Date): { debut: string; fin: string; label: string } {
  const jour = date.getUTCDay();
  let ecart = 7;
  for (const j of JOURS_PUBLICATION_UTC) {
    const d = (j - jour + 7) % 7 || 7;
    if (d < ecart) ecart = d;
  }
  const fin = new Date(date);
  fin.setUTCDate(fin.getUTCDate() + ecart - 1);
  const debutISO = date.toISOString().slice(0, 10);
  const finISO = fin.toISOString().slice(0, 10);
  const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const label = debutISO === finISO ? fmt(debutISO) : `${fmt(debutISO)} – ${fmt(finISO)}`;
  return { debut: debutISO, fin: finISO, label };
}

// Regroupement astrologique standard par qualité (cardinal/fixe/mutable) :
// SIGNS est déjà dans l'ordre du calendrier (Bélier → Poissons), donc la
// qualité se déduit directement de la position (index % 3) sans avoir
// besoin d'un champ dédié sur Sign — 0 = cardinaux (Bélier, Cancer, Balance,
// Capricorne), 1 = fixes (Taureau, Lion, Scorpion, Verseau), 2 = mutables
// (Gémeaux, Vierge, Sagittaire, Poissons).
const NOMS_QUALITE = ['Signes cardinaux', 'Signes fixes', 'Signes mutables'] as const;

function signesParQualite(qualite: 0 | 1 | 2): Sign[] {
  return SIGNS.filter((_, i) => i % 3 === qualite);
}

export type SigneMetier = { sign: Sign; phrase: string };
export type PageGroupe = { titre: string; signes: SigneMetier[] };

export type MetierTousSignesPost = {
  periode: { debut: string; fin: string; label: string };
  legende: string;
  hashtags: string;
  pages: [PageGroupe, PageGroupe, PageGroupe];
  mode: 'ia' | 'demo';
};

// Repli déterministe (sans clé Anthropic) : 2 variantes par signe, tirées
// selon la période couverte pour varier d'une publication à l'autre sans
// jamais nécessiter d'appel IA. Volontairement courtes (une implication
// concrète, pas un horoscope complet — ce post couvre 12 signes d'un coup).
const PHRASES_DEMO: Record<Sign['key'], [string, string]> = {
  belier: [
    "Une initiative que vous portez seul(e) mérite d'être proposée à voix haute cette semaine.",
    'Le rythme professionnel accélère : choisissez UN dossier à mener jusqu\'au bout plutôt que dix en parallèle.',
  ],
  taureau: [
    'La régularité paie plus que le coup d\'éclat : consolidez ce qui fonctionne déjà avant de viser plus loin.',
    "Une négociation financière ou matérielle avance mieux si vous prenez le temps d'en poser les bases par écrit.",
  ],
  gemeaux: [
    'Une conversation professionnelle en amène une autre : le réseau fait plus que le CV cette période-ci.',
    "Deux pistes se présentent en même temps — clarifiez laquelle nourrit vraiment votre trajectoire avant de trancher.",
  ],
  cancer: [
    "L'ambiance d'équipe pèse autant que le résultat : un mot juste au bon moment débloque plus qu'un effort solitaire.",
    'Une mission qui a du sens vous portera plus loin qu\'une mission seulement rentable, cette fois.',
  ],
  lion: [
    'Votre travail mérite d\'être visible : ne laissez pas un autre porter le crédit d\'une idée qui est la vôtre.',
    "Une prise de responsabilité se présente — elle demande de l'assurance, pas de la perfection.",
  ],
  vierge: [
    "Un détail que vous seul(e) remarquez peut éviter un vrai problème : signalez-le, même si ça semble mineur.",
    'La méthode que vous peaufinez depuis des semaines est prête à être partagée avec l\'équipe.',
  ],
  balance: [
    "Un partenariat ou une collaboration a besoin d'un cadre clair plus que d'un compromis silencieux.",
    'Une décision professionnelle traîne parce qu\'elle implique quelqu\'un d\'autre — nommez ce que vous attendez de cette personne.',
  ],
  scorpion: [
    'Une situation professionnelle ambiguë se clarifie si vous posez la question directement, sans détour.',
    "Ce qui se prépare en coulisses depuis un moment est sur le point d'aboutir — restez concentré(e) jusqu'au bout.",
  ],
  sagittaire: [
    'La reconnaissance de vos efforts arrive par un chemin détourné — restez ouvert(e) à une opportunité inattendue.',
    'Une formation, un voyage professionnel ou un nouveau champ à explorer élargit concrètement vos options cette période.',
  ],
  capricorne: [
    "Un objectif de long terme avance d'un cran discret mais réel — notez-le, il compte plus qu'il n'y paraît.",
    'Une figure d\'autorité remarque votre sérieux : c\'est le moment de demander ce que vous n\'osiez pas demander.',
  ],
  verseau: [
    'Une idée qui sort du cadre habituel a plus de chances d\'être entendue si vous l\'appuyez sur un exemple concret.',
    "Le collectif compte plus que d'habitude : une cause ou un projet commun peut relancer votre motivation.",
  ],
  poissons: [
    'Votre intuition sur un dossier professionnel est plus fiable que d\'habitude — accordez-lui du crédit.',
    "Un besoin de sens se fait sentir dans votre activité : identifiez ce qui, concrètement, vous en éloigne.",
  ],
};

function phraseDemo(sign: Sign, seedKey: string): string {
  const rng = mulberry32(hashStr(`metier-tous-signes::${seedKey}::${sign.key}`));
  const paire = PHRASES_DEMO[sign.key];
  return paire[Math.floor(rng() * paire.length)];
}

/** Un seul appel IA groupé pour les 12 signes (au lieu d'un par signe) —
 * c'est précisément la réduction de coût demandée par l'utilisateur. Repli
 * déterministe intégral (PHRASES_DEMO) si l'IA n'est pas configurée ou que
 * l'appel échoue, jamais de blocage de la publication. */
async function phrasesParSigne(periodeLabel: string, seedKey: string): Promise<{ phrases: Record<Sign['key'], string>; mode: 'ia' | 'demo' }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
      const prompt = `Tu es le community manager d'Horosphère. Écris, pour CHACUN des 12 signes du zodiaque, UNE phrase (20 à 30 mots) sur son chemin professionnel pour la période du ${periodeLabel} : nomme un mécanisme concret (trait du signe, dynamique du moment) puis ce que ça implique comme action ou décision professionnelle. Ton direct, jamais fataliste, jamais deux signes avec la même structure de phrase. Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact (clés = identifiants, pas les noms affichés) :
{"belier":"...","taureau":"...","gemeaux":"...","cancer":"...","lion":"...","vierge":"...","balance":"...","scorpion":"...","sagittaire":"...","capricorne":"...","verseau":"...","poissons":"..."}`;
      const parsed = await callClaude(apiKey, model, prompt, 1400);
      const phrases: Partial<Record<Sign['key'], string>> = {};
      for (const s of SIGNS) {
        const v = parsed?.[s.key];
        if (typeof v === 'string' && v.trim()) phrases[s.key] = v.trim();
      }
      if (Object.keys(phrases).length === 12) {
        return { phrases: phrases as Record<Sign['key'], string>, mode: 'ia' };
      }
      throw new Error('réponse IA incomplète (signe manquant)');
    } catch (err) {
      console.error('careerPost: appel IA groupé échoué, repli démo', err);
    }
  }
  const phrases = Object.fromEntries(SIGNS.map((s) => [s.key, phraseDemo(s, seedKey)])) as Record<Sign['key'], string>;
  return { phrases, mode: 'demo' };
}

/** Construit le post "Ton métier selon ton signe" pour la période démarrant
 * à `date` (doit être un jour de publication — lundi/mercredi/vendredi,
 * voir JOURS_PUBLICATION_UTC ; le scénario Make n'appelle cet endpoint que
 * ces jours-là). Couvre les 12 signes en un seul post, regroupés par
 * qualité astrologique. */
export async function genererMetierTousSignes(date: Date = new Date()): Promise<MetierTousSignesPost> {
  const periode = periodeCouverte(date);
  const { phrases, mode } = await phrasesParSigne(periode.label, periode.debut);

  const pages = ([0, 1, 2] as const).map((qualite) => ({
    titre: NOMS_QUALITE[qualite],
    signes: signesParQualite(qualite).map((sign) => ({ sign, phrase: phrases[sign.key] })),
  })) as [PageGroupe, PageGroupe, PageGroupe];

  const legende = [
    `🔮 Ton métier selon ton signe — ${periode.label}`,
    '',
    "Cardinaux, fixes ou mutables : chaque groupe de signes vit une dynamique professionnelle différente en ce moment.",
    '',
    '👉 Swipe pour trouver ton signe et l\'action à mener.',
    '',
    `Chaque semaine, retrouve aussi ton horoscope carrière complet sur horosphere.fr.`,
  ].join('\n');

  return {
    periode,
    legende,
    hashtags: HASHTAGS_METIER,
    pages,
    mode,
  };
}
