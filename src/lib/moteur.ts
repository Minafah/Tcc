// Moteur de sélection des questions (F5, règles des sections 3.4, 9.11 et 14).
// Fonctions pures : aucune dépendance au stockage, faciles à tester.
import type { Distorsion, Question, Session } from './types';
import { contientMotCle, normaliser } from './texte';

/** Nombre de sessions pendant lesquelles une question « pas utile » sort de la rotation. */
export const DUREE_BLOCAGE_PAS_UTILE = 10;
/** Une question posée dans les N dernières sessions (même distorsion) n'est pas reproposée si possible. */
export const FENETRE_ROTATION = 3;
/** Nombre visé de questions de distorsion par session (2 à 3). */
export const NB_QUESTIONS_DISTORSION = 3;

export interface ParamsSelection {
  questions: Question[];
  problematique: string;
  /** Distorsion choisie par l'utilisateur, ou null pour laisser l'application proposer. */
  distorsion: string | null;
  /** Distorsions possibles pour cette problématique. */
  distorsionsPossibles: string[];
  /** Sessions terminées, de la plus récente à la plus ancienne. */
  historique: Session[];
  /**
   * Autres banques où piocher des questions de la même distorsion (règle 13.9 :
   * l'estime de soi recoupe la tristesse et la culpabilité).
   */
  problematiquesAssociees?: string[];
  aleatoire?: () => number;
}

export interface Selection {
  distorsion: string;
  questionIds: string[];
}

export function selectionnerQuestions(p: ParamsSelection): Selection {
  const rng = p.aleatoire ?? Math.random;
  const banque = p.questions.filter((q) => q.problematique === p.problematique);
  const bloquees = questionsBloquees(p.historique);
  const recentesGlobal = idsPoses(p.historique.slice(0, FENETRE_ROTATION));

  const distorsion = p.distorsion ?? distorsionMoinsRecente(p.distorsionsPossibles, p.historique, rng);
  const recentesDistorsion = idsPoses(
    p.historique.filter((s) => s.pensee.distorsions.includes(distorsion)).slice(0, FENETRE_ROTATION),
  );

  const departs = banque.filter((q) => q.categorie === 'depart');
  const clotures = banque.filter((q) => q.categorie === 'cloture');
  const toutesDistorsions = banque.filter((q) => q.categorie === 'distorsion');
  const associees = new Set(p.problematiquesAssociees ?? []);
  const deLaDistorsion = p.questions.filter(
    (q) =>
      q.categorie === 'distorsion' &&
      q.distorsions.includes(distorsion) &&
      (q.problematique === p.problematique || associees.has(q.problematique)),
  );

  // 1 question de départ.
  const depart = choisir(departs, 1, bloquees, recentesGlobal, rng, true);

  // 2 à 3 questions de la distorsion retenue.
  let milieu = choisir(deLaDistorsion, NB_QUESTIONS_DISTORSION, bloquees, recentesDistorsion, rng, false);
  if (milieu.length < 2) {
    // Pas assez de questions disponibles : compléter avec d'autres distorsions.
    const autres = toutesDistorsions.filter((q) => !milieu.includes(q));
    milieu = [...milieu, ...choisir(autres, 2 - milieu.length, bloquees, recentesGlobal, rng, true)];
  }
  milieu = garantirQuestionPreuves(milieu, deLaDistorsion, toutesDistorsions, bloquees, recentesDistorsion, rng);

  // 1 question de clôture (vers la pensée alternative).
  const cloture = choisir(clotures, 1, bloquees, recentesGlobal, rng, true);

  return {
    distorsion,
    questionIds: [...depart, ...milieu, ...cloture].map((q) => q.id),
  };
}

/** Questions marquées « pas utile » dans les 10 dernières sessions. */
export function questionsBloquees(historique: Session[]): Set<string> {
  const ids = new Set<string>();
  for (const s of historique.slice(0, DUREE_BLOCAGE_PAS_UTILE)) {
    for (const r of s.reponses) if (r.utile === false) ids.add(r.questionId);
  }
  return ids;
}

/** Distorsion la moins utilisée récemment (jamais utilisée d'abord ; égalités tirées au sort). */
export function distorsionMoinsRecente(
  possibles: string[],
  historique: Session[],
  rng: () => number = Math.random,
): string {
  const derniereUtilisation = (id: string) => {
    const i = historique.findIndex((s) => s.pensee.distorsions.includes(id));
    return i === -1 ? Infinity : i;
  };
  const scores = possibles.map((id) => ({ id, age: derniereUtilisation(id) }));
  const max = Math.max(...scores.map((s) => s.age));
  const candidats = scores.filter((s) => s.age === max);
  return candidats[Math.floor(rng() * candidats.length)].id;
}

/**
 * Suggère la distorsion dont les mots-clés apparaissent le plus dans la pensée (F14).
 * Une expression de plusieurs mots compte plus qu'un mot isolé : elle est plus spécifique.
 */
export function suggererDistorsion(texte: string, distorsions: Distorsion[]): string | null {
  const t = normaliser(texte);
  if (!t) return null;
  let meilleure: string | null = null;
  let meilleurScore = 0;
  for (const d of distorsions) {
    const score = d.signaux
      .filter((s) => contientMotCle(t, s))
      .reduce((total, s) => total + normaliser(s).split(' ').length, 0);
    if (score > meilleurScore) {
      meilleure = d.id;
      meilleurScore = score;
    }
  }
  return meilleure;
}

/** Seuil à partir duquel l'intensité est « très élevée » (apaisement proposé). */
export const SEUIL_APAISEMENT = 80;
/** Section 5.2 : intensité restée très élevée sur plusieurs sessions consécutives. */
export const SEUIL_PROFESSIONNEL = 70;
export const SESSIONS_PROFESSIONNEL = 3;

export function suggererProfessionnel(historique: Session[]): boolean {
  const dernieres = historique.slice(0, SESSIONS_PROFESSIONNEL);
  return (
    dernieres.length === SESSIONS_PROFESSIONNEL &&
    dernieres.every((s) => (s.emotion.intensiteApres ?? s.emotion.intensiteAvant) >= SEUIL_PROFESSIONNEL)
  );
}

// --- utilitaires internes ---

function idsPoses(sessions: Session[]): Set<string> {
  return new Set(sessions.flatMap((s) => s.questionIds));
}

function melanger<T>(liste: T[], rng: () => number): T[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

/**
 * Choisit n questions : d'abord celles qui ne sont ni bloquées ni récentes,
 * puis les récentes. Les bloquées ne sont utilisées qu'en dernier recours si `secours`.
 */
function choisir(
  pool: Question[],
  n: number,
  bloquees: Set<string>,
  recentes: Set<string>,
  rng: () => number,
  secours: boolean,
): Question[] {
  if (n <= 0) return [];
  const libres = pool.filter((q) => !bloquees.has(q.id));
  const fraiches = libres.filter((q) => !recentes.has(q.id));
  const dejaVues = libres.filter((q) => recentes.has(q.id));
  let ordre = [...melanger(fraiches, rng), ...melanger(dejaVues, rng)];
  if (secours && ordre.length < n) {
    ordre = [...ordre, ...melanger(pool.filter((q) => bloquees.has(q.id)), rng)];
  }
  return ordre.slice(0, n);
}

/** Règle 3.4 : au moins une question sur les preuves, placée en premier. */
function garantirQuestionPreuves(
  choisies: Question[],
  deLaDistorsion: Question[],
  toutes: Question[],
  bloquees: Set<string>,
  recentes: Set<string>,
  rng: () => number,
): Question[] {
  const trier = (liste: Question[]) => [...liste].sort((a, b) => Number(!!b.preuves) - Number(!!a.preuves));
  if (choisies.some((q) => q.preuves) || choisies.length === 0) return trier(choisies);
  const estCandidate = (q: Question) => q.preuves && !choisies.includes(q);
  const remplacante =
    choisir(deLaDistorsion.filter(estCandidate), 1, bloquees, recentes, rng, false)[0] ??
    choisir(toutes.filter(estCandidate), 1, bloquees, recentes, rng, false)[0];
  if (!remplacante) return choisies;
  return [remplacante, ...choisies.slice(0, -1)];
}
