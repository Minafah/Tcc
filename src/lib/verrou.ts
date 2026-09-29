// Verrouillage de l'application (F2) : code personnel, et Face ID / Touch ID via WebAuthn.
// Il s'agit d'un verrou d'accès à l'interface ; les données restent protégées par le
// verrouillage du téléphone lui-même.
import { aleatoire, depuisBase64, empreinte, versBase64 } from './crypto';
import type { Verrouillage } from './types';

const ITERATIONS = 200_000;

export async function creerVerrouillage(code: string): Promise<Verrouillage> {
  const sel = aleatoire(16);
  return {
    empreinte: await empreinte(code, sel, ITERATIONS),
    sel: versBase64(sel),
    iterations: ITERATIONS,
    credentialId: null,
  };
}

export async function verifierCode(v: Verrouillage, code: string): Promise<boolean> {
  return (await empreinte(code, depuisBase64(v.sel), v.iterations)) === v.empreinte;
}

/** Face ID / Touch ID disponible sur cet appareil ? */
export async function biometrieDisponible(): Promise<boolean> {
  try {
    return (
      typeof PublicKeyCredential !== 'undefined' &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
    );
  } catch {
    return false;
  }
}

/** Crée une clé locale protégée par Face ID / Touch ID. Renvoie son identifiant. */
export async function enregistrerBiometrie(): Promise<string> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: aleatoire(32),
      rp: { name: 'TCC' },
      user: { id: aleatoire(16), name: 'moi', displayName: 'Moi' },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'discouraged',
      },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error('Enregistrement annulé');
  return versBase64(cred.rawId);
}

/** Demande Face ID / Touch ID. Renvoie true si la vérification a réussi. */
export async function deverrouillerBiometrie(credentialId: string): Promise<boolean> {
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: aleatoire(32),
        allowCredentials: [{ type: 'public-key', id: depuisBase64(credentialId) }],
        userVerification: 'required',
        timeout: 60_000,
      },
    });
    return assertion !== null;
  } catch {
    return false;
  }
}
