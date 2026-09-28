// Petits utilitaires de chiffrement basés sur WebCrypto (intégré au navigateur, sans dépendance).

export function versBase64(octets: ArrayBuffer | Uint8Array): string {
  const tab = octets instanceof Uint8Array ? octets : new Uint8Array(octets);
  let binaire = '';
  for (const o of tab) binaire += String.fromCharCode(o);
  return btoa(binaire);
}

export function depuisBase64(texte: string): Uint8Array<ArrayBuffer> {
  const binaire = atob(texte);
  const tab = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i++) tab[i] = binaire.charCodeAt(i);
  return tab;
}

export function aleatoire(taille: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(taille));
}

async function cleDeBase(motDePasse: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(motDePasse), 'PBKDF2', false, [
    'deriveBits',
    'deriveKey',
  ]);
}

/** Empreinte PBKDF2-SHA256 d'un code (pour vérifier le code de verrouillage sans le stocker). */
export async function empreinte(code: string, sel: Uint8Array<ArrayBuffer>, iterations: number): Promise<string> {
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: sel, iterations },
    await cleDeBase(code),
    256,
  );
  return versBase64(bits);
}

async function cleAes(motDePasse: string, sel: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: sel, iterations },
    await cleDeBase(motDePasse),
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export interface Chiffre {
  algo: 'AES-GCM/PBKDF2-SHA256';
  iterations: number;
  sel: string;
  iv: string;
  donnees: string;
}

export async function chiffrer(texte: string, motDePasse: string): Promise<Chiffre> {
  const iterations = 310_000;
  const sel = aleatoire(16);
  const iv = aleatoire(12);
  const cle = await cleAes(motDePasse, sel, iterations);
  const donnees = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cle, new TextEncoder().encode(texte));
  return { algo: 'AES-GCM/PBKDF2-SHA256', iterations, sel: versBase64(sel), iv: versBase64(iv), donnees: versBase64(donnees) };
}

/** Déchiffre ; lève une erreur si le mot de passe est faux. */
export async function dechiffrer(c: Chiffre, motDePasse: string): Promise<string> {
  const cle = await cleAes(motDePasse, depuisBase64(c.sel), c.iterations);
  const clair = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: depuisBase64(c.iv) }, cle, depuisBase64(c.donnees));
  return new TextDecoder().decode(clair);
}
