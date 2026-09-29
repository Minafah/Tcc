/**
 * Normalise un texte pour la recherche de mots-clés :
 * minuscules, sans accents, apostrophes et ponctuation remplacées par des espaces.
 * « J'ai PEUR, c'est sûr ! » → « j ai peur c est sur »
 */
export function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Indique si un mot-clé est présent dans un texte déjà normalisé.
 * Le mot-clé doit correspondre à des mots entiers ; s'il finit par « * »,
 * son dernier mot peut être un début de mot (« suicid* » → « suicidaire »).
 */
export function contientMotCle(texteNormalise: string, motCle: string): boolean {
  const prefixe = motCle.endsWith('*');
  const cle = normaliser(prefixe ? motCle.slice(0, -1) : motCle);
  if (!cle) return false;
  const fin = prefixe ? '' : '(?: |$)';
  return new RegExp(`(?:^| )${cle}${fin}`).test(texteNormalise);
}
