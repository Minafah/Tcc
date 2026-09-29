// Réglages : verrouillage, personnes de confiance, sauvegarde, suppression des données.
import { useEffect, useRef, useState } from 'react';
import { Entete } from '../components/ui';
import { creerSauvegarde, estChiffree, partagerFichier, restaurer } from '../lib/sauvegarde';
import type { Reglages as TReglages } from '../lib/types';
import { biometrieDisponible, creerVerrouillage, enregistrerBiometrie } from '../lib/verrou';

export function Reglages(props: {
  reglages: TReglages;
  onChange: (r: TReglages) => void;
  onDonneesRestaurees: () => void;
  onToutEffacer: () => void;
  onRevoirPresentation: () => void;
  onRetour: () => void;
  onSos: () => void;
}) {
  return (
    <div className="page">
      <Entete titre="Réglages" onRetour={props.onRetour} onSos={props.onSos} />
      <div className="contenu">
        <SectionVerrouillage {...props} />
        <SectionPersonnes {...props} />
        <SectionSauvegarde onRestauree={props.onDonneesRestaurees} />
        <div className="carte">
          <h3>À propos</h3>
          <p className="doux petit">
            Outil d'auto-assistance à usage personnel. Il ne remplace pas un professionnel de santé et ne pose aucun
            diagnostic. Toutes les données restent sur ce téléphone.
          </p>
          <button className="bouton discret" onClick={props.onRevoirPresentation}>
            Revoir la présentation
          </button>
        </div>
        <div className="carte">
          <h3>Effacer mes données</h3>
          <p className="doux petit">Supprime toutes les sessions et tous les réglages de ce téléphone.</p>
          <button
            className="bouton danger"
            onClick={() => {
              if (confirm('Effacer toutes tes données ? Cette action est définitive.') && confirm('Vraiment tout effacer ?')) {
                props.onToutEffacer();
              }
            }}
          >
            Tout effacer
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionVerrouillage({ reglages, onChange }: { reglages: TReglages; onChange: (r: TReglages) => void }) {
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [bioDispo, setBioDispo] = useState(false);
  const v = reglages.verrouillage;

  useEffect(() => {
    biometrieDisponible().then(setBioDispo);
  }, []);

  const activer = async () => {
    if (code.length < 4) return setMessage('Le code doit faire au moins 4 chiffres.');
    if (code !== confirmation) return setMessage('Les deux codes ne correspondent pas.');
    onChange({ ...reglages, verrouillage: await creerVerrouillage(code) });
    setCode('');
    setConfirmation('');
    setMessage('Verrouillage activé.');
  };

  const activerBiometrie = async () => {
    if (!v) return;
    try {
      onChange({ ...reglages, verrouillage: { ...v, credentialId: await enregistrerBiometrie() } });
      setMessage('Face ID / Touch ID activé.');
    } catch {
      setMessage("Face ID / Touch ID n'a pas pu être activé.");
    }
  };

  const chiffres = (s: string) => s.replace(/\D/g, '').slice(0, 8);

  return (
    <div className="carte">
      <h3>Verrouillage</h3>
      {v ? (
        <>
          <p className="doux petit">L'application demande ton code à l'ouverture et après une minute en arrière-plan.</p>
          {bioDispo && !v.credentialId ? (
            <button className="bouton secondaire" onClick={activerBiometrie}>
              Activer Face ID / Touch ID
            </button>
          ) : null}
          {v.credentialId ? (
            <button className="bouton discret" onClick={() => onChange({ ...reglages, verrouillage: { ...v, credentialId: null } })}>
              Désactiver Face ID / Touch ID
            </button>
          ) : null}
          <button
            className="bouton discret"
            onClick={() => {
              onChange({ ...reglages, verrouillage: null });
              setMessage('Verrouillage désactivé.');
            }}
          >
            Désactiver le verrouillage
          </button>
        </>
      ) : (
        <>
          <p className="doux petit">Choisis un code d'au moins 4 chiffres.</p>
          <input type="password" inputMode="numeric" placeholder="Code" value={code} onChange={(e) => setCode(chiffres(e.target.value))} />
          <input
            type="password"
            inputMode="numeric"
            placeholder="Confirme le code"
            value={confirmation}
            onChange={(e) => setConfirmation(chiffres(e.target.value))}
          />
          <button className="bouton" onClick={activer}>
            Activer le verrouillage
          </button>
        </>
      )}
      {message ? <p className="petit">{message}</p> : null}
    </div>
  );
}

function SectionPersonnes({ reglages, onChange }: { reglages: TReglages; onChange: (r: TReglages) => void }) {
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const personnes = reglages.personnesConfiance;

  const ajouter = () => {
    if (!nom.trim() || !telephone.trim()) return;
    onChange({ ...reglages, personnesConfiance: [...personnes, { nom: nom.trim(), telephone: telephone.trim() }] });
    setNom('');
    setTelephone('');
  };

  return (
    <div className="carte">
      <h3>Personnes de confiance</h3>
      <p className="doux petit">Une ou deux personnes à appeler en un geste depuis l'écran SOS.</p>
      {personnes.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1 }}>
            {p.nom} · <span className="doux">{p.telephone}</span>
          </span>
          <button
            className="icone"
            aria-label={`Retirer ${p.nom}`}
            onClick={() => onChange({ ...reglages, personnesConfiance: personnes.filter((_, j) => j !== i) })}
          >
            ✕
          </button>
        </div>
      ))}
      {personnes.length < 2 ? (
        <>
          <input type="text" placeholder="Prénom" value={nom} onChange={(e) => setNom(e.target.value)} />
          <input type="tel" placeholder="Numéro de téléphone" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
          <button className="bouton secondaire" onClick={ajouter} disabled={!nom.trim() || !telephone.trim()}>
            Ajouter
          </button>
        </>
      ) : null}
    </div>
  );
}

function SectionSauvegarde({ onRestauree }: { onRestauree: () => void }) {
  const [motDePasse, setMotDePasse] = useState('');
  const [message, setMessage] = useState('');
  const fichierRef = useRef<HTMLInputElement>(null);

  const exporter = async () => {
    try {
      await partagerFichier(await creerSauvegarde(motDePasse));
      setMessage('Sauvegarde créée.');
    } catch (e) {
      setMessage(`La sauvegarde a échoué : ${(e as Error).message}`);
    }
  };

  const importer = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    e.target.value = '';
    if (!fichier) return;
    try {
      const texte = await fichier.text();
      let mdp = '';
      if (estChiffree(texte)) {
        mdp = prompt('Mot de passe de la sauvegarde :') ?? '';
        if (!mdp) return;
      }
      const n = await restaurer(texte, mdp);
      setMessage(`${n} session${n > 1 ? 's' : ''} restaurée${n > 1 ? 's' : ''}.`);
      onRestauree();
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  return (
    <div className="carte">
      <h3>Sauvegarde</h3>
      <p className="doux petit">
        Si tu perds ton téléphone ou si l'iPhone vide les données du site, ton journal disparaît. Enregistre une
        sauvegarde de temps en temps (dans Fichiers ou iCloud Drive).
      </p>
      <input
        type="password"
        placeholder="Mot de passe pour chiffrer (recommandé)"
        value={motDePasse}
        onChange={(e) => setMotDePasse(e.target.value)}
        autoComplete="new-password"
      />
      <button className="bouton secondaire" onClick={exporter}>
        Exporter mon journal
      </button>
      <button className="bouton discret" onClick={() => fichierRef.current?.click()}>
        Restaurer une sauvegarde
      </button>
      <input ref={fichierRef} type="file" accept="application/json,.json" hidden onChange={importer} />
      {message ? <p className="petit">{message}</p> : null}
    </div>
  );
}
