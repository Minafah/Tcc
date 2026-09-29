import type { Session } from './types';

export function nouvelleSession(): Session {
  const maintenant = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    date: maintenant,
    majLe: maintenant,
    statut: 'brouillon',
    etape: 'situation',
    problematique: 'anxiete',
    situation: '',
    emotion: { libelle: '', intensiteAvant: 50, intensiteApres: null },
    pensee: { texte: '', croyanceAvant: 50, croyanceApres: null, distorsions: [] },
    questionIds: [],
    indexQuestion: 0,
    reponses: [],
    penseeAlternative: { texte: '', croyance: null },
    criseAcquittee: [],
  };
}

export function formaterDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Tous les textes libres d'une session (pour la recherche et la détection de crise). */
export function textesLibres(s: Session): string[] {
  return [s.situation, s.pensee.texte, ...s.reponses.map((r) => r.texte), s.penseeAlternative.texte];
}
