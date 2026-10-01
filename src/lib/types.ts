// Types partagés par toute l'application.

export type CategorieQuestion = 'depart' | 'distorsion' | 'cloture';

/** Question de la banque (contenu clinique statique, fichier JSON). */
export interface Question {
  id: string;
  problematique: string;
  categorie: CategorieQuestion;
  distorsions: string[];
  /** Question qui porte sur les preuves (règle 3.4 : au moins une par session). */
  preuves?: boolean;
  texte: string;
}

export interface Distorsion {
  id: string;
  libelle: string;
  definition: string;
  exemple: string;
  /** Mots-clés (normalisés) qui suggèrent cette distorsion dans la pensée. */
  signaux: string[];
  /** Fiche « Comprendre ce piège » : ce que c'est, et ce qui se passe dans le cerveau, le corps et l'esprit. */
  explication?: {
    quoi: string;
    cerveau: string;
    corps: string;
    esprit: string;
    astuce: string;
  };
}

export interface Problematique {
  id: string;
  libelle: string;
  description: string;
  active: boolean;
}

export interface Reponse {
  questionId: string;
  texte: string;
  /** true = utile, false = pas utile, null = non renseigné. */
  utile: boolean | null;
  passee: boolean;
}

export type Etape = 'situation' | 'pensee' | 'apaisement' | 'comprendre' | 'questions' | 'alternative' | 'bilan';

export interface Session {
  id: string;
  /** Date de création (ISO). */
  date: string;
  /** Dernière modification (ISO). */
  majLe: string;
  statut: 'brouillon' | 'terminee';
  /** Étape où reprendre un brouillon. */
  etape: Etape;
  problematique: string;
  situation: string;
  emotion: {
    libelle: string;
    intensiteAvant: number;
    intensiteApres: number | null;
  };
  pensee: {
    texte: string;
    croyanceAvant: number;
    croyanceApres: number | null;
    /** Distorsion(s) retenue(s) pour cette session. */
    distorsions: string[];
  };
  /** Questions sélectionnées par le moteur, dans l'ordre. */
  questionIds: string[];
  indexQuestion: number;
  reponses: Reponse[];
  penseeAlternative: {
    texte: string;
    croyance: number | null;
    /** Chemin guidé choisi (index dans les gabarits), -1 = mes propres mots, absent = pas encore choisi. */
    gabarit?: number;
    /** Réponses aux cases du chemin guidé. */
    champs?: Record<string, string>;
  };
  /** Mots de crise déjà signalés et pour lesquels j'ai choisi de continuer. */
  criseAcquittee: string[];
}

export interface PersonneConfiance {
  nom: string;
  telephone: string;
}

export interface Verrouillage {
  /** Empreinte PBKDF2 du code (base64). */
  empreinte: string;
  sel: string;
  iterations: number;
  /** Identifiant de la clé Face ID / Touch ID (WebAuthn), base64. */
  credentialId: string | null;
}

export interface Reglages {
  onboardingFait: boolean;
  verrouillage: Verrouillage | null;
  personnesConfiance: PersonneConfiance[];
}

export const REGLAGES_DEFAUT: Reglages = {
  onboardingFait: false,
  verrouillage: null,
  personnesConfiance: [],
};
