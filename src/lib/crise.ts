// Détection locale de mots liés à une crise (F9, section 5.1).
// Rien n'est envoyé nulle part : la comparaison se fait sur le téléphone.
import crise from '../content/crise.json';
import { contientMotCle, normaliser } from './texte';

export const MOTS_CLES_CRISE: string[] = crise.motsCles;
export const RESSOURCES_URGENCE = crise.ressources;

/** Renvoie les mots-clés de crise trouvés dans les textes (liste vide si aucun). */
export function detecterCrise(textes: string[], motsCles: string[] = MOTS_CLES_CRISE): string[] {
  const texte = normaliser(textes.join(' '));
  if (!texte) return [];
  return motsCles.filter((mot) => contientMotCle(texte, mot));
}
