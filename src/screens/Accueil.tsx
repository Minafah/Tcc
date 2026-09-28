import { AvantApres, Entete } from '../components/ui';
import { formaterDate } from '../lib/session';
import type { Session } from '../lib/types';

export function Accueil(props: {
  brouillon: Session | undefined;
  derniere: Session | undefined;
  onNouvelle: () => void;
  onReprendre: () => void;
  onJournal: () => void;
  onReglages: () => void;
  onSos: () => void;
}) {
  const { brouillon, derniere } = props;
  return (
    <div className="page">
      <Entete
        titre="Prendre du recul"
        onSos={props.onSos}
        droite={
          <button className="icone" onClick={props.onReglages} aria-label="Réglages">
            ⚙︎
          </button>
        }
      />
      <div className="contenu">
        <button className="bouton large" onClick={props.onNouvelle}>
          Nouvelle pensée
        </button>

        {brouillon ? (
          <button className="carte carte-cliquable" onClick={props.onReprendre}>
            <span className="badge">En cours</span>
            <strong>Reprendre ma session</strong>
            <span className="doux petit extrait">
              {brouillon.pensee.texte || brouillon.situation || 'Session commencée'} · {formaterDate(brouillon.majLe)}
            </span>
          </button>
        ) : null}

        {derniere ? (
          <div className="carte">
            <p className="doux petit">Dernier bilan · {formaterDate(derniere.date)}</p>
            <AvantApres titre={derniere.emotion.libelle} avant={derniere.emotion.intensiteAvant} apres={derniere.emotion.intensiteApres} />
          </div>
        ) : (
          <p className="doux">
            Quand une émotion forte arrive, note la situation et la pensée qui l'accompagne : l'application te pose ensuite
            quelques questions pour prendre du recul.
          </p>
        )}
      </div>
      <div className="actions">
        <button className="bouton secondaire" onClick={props.onJournal}>
          Mon journal
        </button>
      </div>
    </div>
  );
}
