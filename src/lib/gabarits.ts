// Chemins guidés pour construire la pensée alternative (F6), sans crochets à remplacer à la main.
// Une phrase modèle contient des cases [cle] : chacune est remplie via une question douce,
// sauf [piege], remplie automatiquement avec le type de pensée choisi.

export interface Champ {
  question: string;
  exemple: string;
}

export interface Gabarit {
  titre: string;
  emoji: string;
  phrase: string;
  champs: Record<string, Champ>;
}

/** Case remplie automatiquement avec le piège de pensée choisi. */
export const CLE_PIEGE = 'piege';

export type Morceau = { texte: string } | { cle: string };

/** Découpe « Il est possible que [redoute], mais… » en texte fixe et cases. */
export function morceaux(phrase: string): Morceau[] {
  const resultat: Morceau[] = [];
  const re = /\[(\w+)\]/g;
  let dernier = 0;
  for (let m = re.exec(phrase); m; m = re.exec(phrase)) {
    if (m.index > dernier) resultat.push({ texte: phrase.slice(dernier, m.index) });
    resultat.push({ cle: m[1] });
    dernier = m.index + m[0].length;
  }
  if (dernier < phrase.length) resultat.push({ texte: phrase.slice(dernier) });
  return resultat;
}

/** Cases que je dois remplir moi-même, dans l'ordre de la phrase. */
export function casesARemplir(g: Gabarit): string[] {
  return morceaux(g.phrase).flatMap((m) => ('cle' in m && m.cle !== CLE_PIEGE ? [m.cle] : []));
}

export function valeurPiege(libelleDistorsion: string | undefined): string {
  return libelleDistorsion ? `le piège « ${libelleDistorsion} »` : 'un piège de pensée';
}

/** Toutes les cases sont-elles remplies ? */
export function estComplet(g: Gabarit, valeurs: Record<string, string>): boolean {
  return casesARemplir(g).every((cle) => (valeurs[cle] ?? '').trim() !== '');
}

export type Segment = { texte: string } | { cle: string; valeur: string };

/**
 * Phrase prête à afficher : le texte fixe, et chaque case avec sa valeur (vide si pas encore remplie).
 * Gère l'élision : « que » + « on » → « qu'on ».
 */
export function segments(g: Gabarit, valeurs: Record<string, string>, libelleDistorsion?: string): Segment[] {
  const resultat: Segment[] = [];
  for (const m of morceaux(g.phrase)) {
    if ('texte' in m) {
      resultat.push({ texte: m.texte });
      continue;
    }
    const valeur = m.cle === CLE_PIEGE ? valeurPiege(libelleDistorsion) : (valeurs[m.cle] ?? '').trim();
    const precedent = resultat[resultat.length - 1];
    if (valeur && precedent && 'texte' in precedent) precedent.texte = elider(precedent.texte, valeur);
    resultat.push({ cle: m.cle, valeur });
  }
  return resultat;
}

/** Assemble la phrase ; une case vide devient « … ». */
export function composer(g: Gabarit, valeurs: Record<string, string>, libelleDistorsion?: string): string {
  return segments(g, valeurs, libelleDistorsion)
    .map((x) => ('texte' in x ? x.texte : x.valeur || '…'))
    .join('');
}

/** « … que » + « il » → « … qu' » ; idem pour de, je, ne, me, te, se, le, la. */
function elider(avant: string, suite: string): string {
  // Le « h » est laissé de côté : trop de h aspirés (« le hasard », « la honte »).
  if (!/^[aeiouyàâäéèêëîïôöûüœ]/i.test(suite)) return avant;
  return avant.replace(/(^|[\s'])(qu|d|j|n|m|t|s|l)(e|a) $/i, (_tout, debut: string, radical: string, voyelle: string) =>
    radical.toLowerCase() === 'l' || voyelle.toLowerCase() === 'e' ? `${debut}${radical}'` : `${debut}${radical}${voyelle} `,
  );
}
