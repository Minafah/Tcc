// Sauvegarde et restauration manuelles du journal (fichier JSON, chiffré si un mot de passe est donné).
import { chiffrer, dechiffrer, type Chiffre } from './crypto';
import { enregistrerReglages, enregistrerSessions, listerSessions, lireReglages } from './db';
import type { Session } from './types';

interface ContenuSauvegarde {
  format: 'tcc-sauvegarde';
  version: 1;
  exporteLe: string;
  sessions: Session[];
  personnesConfiance: { nom: string; telephone: string }[];
}

interface FichierChiffre {
  format: 'tcc-sauvegarde-chiffree';
  version: 1;
  chiffre: Chiffre;
}

export async function creerSauvegarde(motDePasse: string): Promise<File> {
  const reglages = await lireReglages();
  const contenu: ContenuSauvegarde = {
    format: 'tcc-sauvegarde',
    version: 1,
    exporteLe: new Date().toISOString(),
    sessions: await listerSessions(),
    personnesConfiance: reglages.personnesConfiance,
  };
  let texte = JSON.stringify(contenu);
  if (motDePasse) {
    const fichier: FichierChiffre = { format: 'tcc-sauvegarde-chiffree', version: 1, chiffre: await chiffrer(texte, motDePasse) };
    texte = JSON.stringify(fichier);
  }
  const jour = new Date().toISOString().slice(0, 10);
  return new File([texte], `tcc-sauvegarde-${jour}.json`, { type: 'application/json' });
}

/** Propose le fichier via la feuille de partage (iPhone : « Enregistrer dans Fichiers »), sinon le télécharge. */
export async function partagerFichier(fichier: File): Promise<void> {
  if (navigator.canShare?.({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier] });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(fichier);
  const a = document.createElement('a');
  a.href = url;
  a.download = fichier.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function estChiffree(texte: string): boolean {
  try {
    return JSON.parse(texte).format === 'tcc-sauvegarde-chiffree';
  } catch {
    return false;
  }
}

/** Restaure une sauvegarde. Les sessions sont fusionnées (même identifiant = remplacée). */
export async function restaurer(texte: string, motDePasse: string): Promise<number> {
  let donnees = JSON.parse(texte);
  if (donnees.format === 'tcc-sauvegarde-chiffree') {
    try {
      donnees = JSON.parse(await dechiffrer((donnees as FichierChiffre).chiffre, motDePasse));
    } catch {
      throw new Error('Mot de passe incorrect.');
    }
  }
  if (donnees.format !== 'tcc-sauvegarde' || !Array.isArray(donnees.sessions)) {
    throw new Error("Ce fichier n'est pas une sauvegarde de l'application.");
  }
  const contenu = donnees as ContenuSauvegarde;
  await enregistrerSessions(contenu.sessions);
  const reglages = await lireReglages();
  if (reglages.personnesConfiance.length === 0 && contenu.personnesConfiance?.length) {
    await enregistrerReglages({ ...reglages, personnesConfiance: contenu.personnesConfiance });
  }
  return contenu.sessions.length;
}
