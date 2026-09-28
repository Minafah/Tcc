// Stockage local sur le téléphone (IndexedDB). Aucune donnée ne quitte l'appareil.
import { REGLAGES_DEFAUT, type Reglages, type Session } from './types';

const NOM_BASE = 'tcc';
const VERSION_BASE = 1;
const SESSIONS = 'sessions';
const REGLAGES = 'reglages';
const CLE_REGLAGES = 'reglages';

let basePromise: Promise<IDBDatabase> | null = null;

function ouvrir(): Promise<IDBDatabase> {
  if (!basePromise) {
    basePromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(NOM_BASE, VERSION_BASE);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(SESSIONS)) db.createObjectStore(SESSIONS, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(REGLAGES)) db.createObjectStore(REGLAGES);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return basePromise;
}

/** Exécute une requête dans une transaction et attend qu'elle soit enregistrée sur le disque. */
async function executer<T>(
  store: string,
  mode: IDBTransactionMode,
  action: (s: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T> {
  const db = await ouvrir();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = action(tx.objectStore(store));
    tx.oncomplete = () => resolve(req ? req.result : (undefined as T));
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// --- Sessions ---

export async function listerSessions(): Promise<Session[]> {
  const toutes = await executer<Session[]>(SESSIONS, 'readonly', (s) => s.getAll());
  return toutes.sort((a, b) => b.date.localeCompare(a.date));
}

/** Sessions terminées, de la plus récente à la plus ancienne (historique du moteur). */
export async function historique(): Promise<Session[]> {
  return (await listerSessions()).filter((s) => s.statut === 'terminee');
}

export async function brouillonEnCours(): Promise<Session | undefined> {
  const brouillons = (await listerSessions()).filter((s) => s.statut === 'brouillon');
  return brouillons.sort((a, b) => b.majLe.localeCompare(a.majLe))[0];
}

export async function enregistrerSession(session: Session): Promise<void> {
  await executer(SESSIONS, 'readwrite', (s) => s.put(session));
}

export async function enregistrerSessions(sessions: Session[]): Promise<void> {
  await executer(SESSIONS, 'readwrite', (s) => {
    for (const session of sessions) s.put(session);
  });
}

export async function supprimerSession(id: string): Promise<void> {
  await executer(SESSIONS, 'readwrite', (s) => s.delete(id));
}

// --- Réglages ---

export async function lireReglages(): Promise<Reglages> {
  const r = await executer<Reglages | undefined>(REGLAGES, 'readonly', (s) => s.get(CLE_REGLAGES));
  return { ...REGLAGES_DEFAUT, ...r };
}

export async function enregistrerReglages(reglages: Reglages): Promise<void> {
  await executer(REGLAGES, 'readwrite', (s) => s.put(reglages, CLE_REGLAGES));
}

// --- Tout effacer ---

export async function effacerTout(): Promise<void> {
  await executer(SESSIONS, 'readwrite', (s) => s.clear());
  await executer(REGLAGES, 'readwrite', (s) => s.clear());
}

/** Demande au navigateur de ne pas purger les données (important sur iPhone). */
export async function demanderStockagePersistant(): Promise<void> {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // Non disponible : sans conséquence, la sauvegarde manuelle reste la protection principale.
  }
}
