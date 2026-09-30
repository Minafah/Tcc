// Accès typé au contenu clinique (fichier JSON séparé du code, modifiable sans toucher à la logique).
import donnees from '../content/questions.json';
import type { Distorsion, Problematique, Question } from './types';

export const EMOTIONS: string[] = donnees.emotions;
/** Problématique proposée automatiquement quand je choisis une émotion (modifiable ensuite). */
export const EMOTIONS_VERS_PROBLEMATIQUE: Record<string, string> = donnees.emotionsVersProblematique;
/** Distorsions à privilégier selon l'émotion (ex. honte → dévalorisation, doubles standards). */
export const DISTORSIONS_PRIORITAIRES: Record<string, string[]> = donnees.distorsionsPrioritairesParEmotion;
export const PROBLEMATIQUES: Problematique[] = donnees.problematiques;
export const DISTORSIONS: Distorsion[] = donnees.distorsions;
export const QUESTIONS: Question[] = donnees.questions as Question[];
export const GABARITS: Record<string, string[]> = donnees.gabarits;
export const VERIFICATION: Record<string, string[]> = donnees.verification;

const questionsParId = new Map(QUESTIONS.map((q) => [q.id, q]));
const distorsionsParId = new Map(DISTORSIONS.map((d) => [d.id, d]));

export function question(id: string): Question | undefined {
  return questionsParId.get(id);
}

export function distorsion(id: string): Distorsion | undefined {
  return distorsionsParId.get(id);
}

/** Distorsions qui ont au moins une question pour cette problématique. */
export function distorsionsDe(problematique: string): Distorsion[] {
  const ids = new Set(
    QUESTIONS.filter((q) => q.problematique === problematique).flatMap((q) => q.distorsions),
  );
  return DISTORSIONS.filter((d) => ids.has(d.id));
}
