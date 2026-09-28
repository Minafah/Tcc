// Écran de déverrouillage (F2).
import { useEffect, useState } from 'react';
import type { Verrouillage } from '../lib/types';
import { deverrouillerBiometrie, verifierCode } from '../lib/verrou';

export function Verrou(props: { verrouillage: Verrouillage; onDeverrouille: () => void; onSos: () => void }) {
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState('');
  const [verification, setVerification] = useState(false);
  const { credentialId } = props.verrouillage;

  const biometrie = async () => {
    if (credentialId && (await deverrouillerBiometrie(credentialId))) props.onDeverrouille();
  };

  useEffect(() => {
    // Propose Face ID directement à l'ouverture (l'iPhone peut exiger un geste : le bouton reste disponible).
    biometrie();
  }, []);

  const valider = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerification(true);
    const ok = await verifierCode(props.verrouillage, code);
    setVerification(false);
    if (ok) props.onDeverrouille();
    else {
      setErreur('Code incorrect.');
      setCode('');
    }
  };

  return (
    <div className="page">
      <header className="entete">
        <h1>Application verrouillée</h1>
        <button className="bouton-sos" onClick={props.onSos}>
          SOS
        </button>
      </header>
      <form className="contenu" style={{ justifyContent: 'center' }} onSubmit={valider}>
        <label>
          Ton code
          <input
            className="code"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            pattern="[0-9]*"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, ''));
              setErreur('');
            }}
            autoFocus={!credentialId}
          />
        </label>
        {erreur ? <p style={{ color: 'var(--sos)' }}>{erreur}</p> : null}
        <button className="bouton" type="submit" disabled={code.length < 4 || verification}>
          Déverrouiller
        </button>
        {credentialId ? (
          <button className="bouton secondaire" type="button" onClick={biometrie}>
            Utiliser Face ID / Touch ID
          </button>
        ) : null}
      </form>
    </div>
  );
}
