// Écran SOS (F9) : ressources d'urgence, personnes de confiance, apaisement.
// Ouvert par le bouton SOS (mode « sos ») ou par la détection de mots de crise (mode « crise »).
import { Ancrage, Respiration } from '../components/Apaisement';
import { RESSOURCES_URGENCE } from '../lib/crise';
import type { PersonneConfiance } from '../lib/types';

export function Sos(props: {
  mode: 'sos' | 'crise';
  personnes: PersonneConfiance[];
  onFermer: () => void;
  /** Mode crise : continuer la session. */
  onContinuer?: () => void;
  /** Mode crise : arrêter pour l'instant (le brouillon est gardé). */
  onArreter?: () => void;
}) {
  const crise = props.mode === 'crise';
  return (
    <div className="superposition" role="dialog" aria-modal="true" aria-label="Ressources d'urgence">
      <div className="page">
        <header className="entete">
          <h1>{crise ? 'Une pause' : 'SOS'}</h1>
          {!crise ? (
            <button className="icone" onClick={props.onFermer} aria-label="Fermer">
              ✕
            </button>
          ) : null}
        </header>

        <div className="contenu">
          <div className="encart alerte">
            {crise ? (
              <p>
                Ce que tu as écrit semble très lourd à porter. Tu n'as pas à traverser ça seul·e. Si tu penses à te faire
                du mal, parler à quelqu'un maintenant peut vraiment aider.
              </p>
            ) : (
              <p>Si tu te sens en danger ou dépassé·e, tu peux appeler quelqu'un maintenant, à toute heure.</p>
            )}
          </div>

          <div className="liste">
            {RESSOURCES_URGENCE.map((r) => (
              <a key={r.numero} className="carte numero" href={`tel:${r.numero}`}>
                <strong>{r.numero}</strong>
                <span>
                  {r.libelle}
                  <br />
                  <span className="doux petit">{r.detail}</span>
                </span>
              </a>
            ))}
            {props.personnes.map((p) => (
              <a key={p.telephone} className="carte numero" href={`tel:${p.telephone.replace(/\s/g, '')}`}>
                <strong>☎</strong>
                <span>
                  Appeler {p.nom}
                  <br />
                  <span className="doux petit">Personne de confiance</span>
                </span>
              </a>
            ))}
          </div>

          <div className="carte">
            <h3>Respirer un moment</h3>
            <Respiration />
          </div>
          <Ancrage />
        </div>

        {crise ? (
          <div className="actions" style={{ flexDirection: 'column' }}>
            <button className="bouton secondaire" onClick={props.onContinuer}>
              Je veux continuer la session
            </button>
            <button className="bouton discret" onClick={props.onArreter}>
              Arrêter pour l'instant
            </button>
          </div>
        ) : (
          <div className="actions">
            <button className="bouton secondaire" onClick={props.onFermer}>
              Revenir à l'application
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
