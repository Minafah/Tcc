import type { Session } from './types';

let compteur = 0;

/** Session vide pour les tests (sans dépendre de crypto.randomUUID). */
export function nouvelleSessionTest(): Session {
  compteur++;
  const date = new Date(2026, 0, 1, 0, compteur).toISOString();
  return {
    id: `test-${compteur}`,
    date,
    majLe: date,
    statut: 'brouillon',
    etape: 'situation',
    problematique: 'anxiete',
    situation: '',
    emotion: { libelle: 'Anxiété', intensiteAvant: 50, intensiteApres: null },
    pensee: { texte: '', croyanceAvant: 50, croyanceApres: null, distorsions: [] },
    questionIds: [],
    indexQuestion: 0,
    reponses: [],
    penseeAlternative: { texte: '', croyance: null },
    criseAcquittee: [],
  };
}
