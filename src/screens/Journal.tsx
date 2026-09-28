// Journal (F8) : liste, recherche, filtre, détail, modification et suppression.
import { useMemo, useState } from 'react';
import { AvantApres, Entete } from '../components/ui';
import { distorsion, question } from '../lib/contenu';
import { formaterDate, textesLibres } from '../lib/session';
import { normaliser } from '../lib/texte';
import type { Session } from '../lib/types';

export function Journal(props: {
  sessions: Session[];
  onOuvrir: (id: string) => void;
  onRetour: () => void;
  onSos: () => void;
}) {
  const [recherche, setRecherche] = useState('');
  const [emotion, setEmotion] = useState('');
  const emotions = useMemo(
    () => [...new Set(props.sessions.map((s) => s.emotion.libelle).filter(Boolean))].sort(),
    [props.sessions],
  );

  const filtrees = props.sessions.filter((s) => {
    if (emotion && s.emotion.libelle !== emotion) return false;
    if (!recherche.trim()) return true;
    return normaliser(textesLibres(s).join(' ')).includes(normaliser(recherche));
  });

  return (
    <div className="page">
      <Entete titre="Mon journal" onRetour={props.onRetour} onSos={props.onSos} />
      <div className="contenu">
        <input type="search" placeholder="Rechercher…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
        {emotions.length > 1 ? (
          <select value={emotion} onChange={(e) => setEmotion(e.target.value)} aria-label="Filtrer par émotion">
            <option value="">Toutes les émotions</option>
            {emotions.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        ) : null}

        {filtrees.length === 0 ? (
          <p className="doux">{props.sessions.length === 0 ? 'Aucune session pour le moment.' : 'Aucun résultat.'}</p>
        ) : (
          <div className="liste">
            {filtrees.map((s) => (
              <button key={s.id} className="carte carte-cliquable" onClick={() => props.onOuvrir(s.id)}>
                <span className="doux petit">
                  {formaterDate(s.date)} {s.statut === 'brouillon' ? <span className="badge">Brouillon</span> : null}
                </span>
                <strong>
                  {s.emotion.libelle || 'Émotion non renseignée'} · {s.emotion.intensiteAvant}
                  {s.emotion.intensiteApres !== null ? ` → ${s.emotion.intensiteApres}` : ''}
                </strong>
                <span className="extrait">{s.pensee.texte || s.situation}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function DetailSession(props: {
  session: Session;
  onEnregistrer: (s: Session) => void;
  onSupprimer: () => void;
  onReprendre: () => void;
  onRetour: () => void;
  onSos: () => void;
}) {
  const [edition, setEdition] = useState<Session | null>(null);
  const s = edition ?? props.session;
  const d = distorsion(s.pensee.distorsions[0]);

  const champ = (valeur: string, onChange: (v: string) => void) =>
    edition ? <textarea value={valeur} onChange={(e) => onChange(e.target.value)} /> : <p>{valeur || '–'}</p>;

  const supprimer = () => {
    if (confirm('Supprimer définitivement cette session ?')) props.onSupprimer();
  };

  return (
    <div className="page">
      <Entete titre={formaterDate(s.date)} onRetour={props.onRetour} onSos={props.onSos} />
      <div className="contenu">
        <div className="carte">
          <h3>Situation</h3>
          {champ(s.situation, (situation) => setEdition({ ...s, situation }))}
        </div>

        <div className="carte">
          <AvantApres titre={s.emotion.libelle || 'Émotion'} avant={s.emotion.intensiteAvant} apres={s.emotion.intensiteApres} />
        </div>

        <div className="carte">
          <h3>Pensée automatique</h3>
          {champ(s.pensee.texte, (texte) => setEdition({ ...s, pensee: { ...s.pensee, texte } }))}
          <AvantApres titre="Croyance" avant={s.pensee.croyanceAvant} apres={s.pensee.croyanceApres} unite=" %" />
          {d ? <p className="doux petit">Type de pensée : {d.libelle}</p> : null}
        </div>

        {s.reponses.length > 0 ? (
          <div className="carte">
            <h3>Questionnement</h3>
            {s.reponses.map((r, i) => (
              <div key={r.questionId}>
                <p className="doux petit">
                  {question(r.questionId)?.texte ?? 'Question retirée'}
                  {r.utile === true ? ' · 👍' : r.utile === false ? ' · 👎' : ''}
                  {r.passee ? ' · passée' : ''}
                </p>
                {champ(r.texte, (texte) => {
                  const reponses = [...s.reponses];
                  reponses[i] = { ...r, texte };
                  setEdition({ ...s, reponses });
                })}
              </div>
            ))}
          </div>
        ) : null}

        <div className="carte">
          <h3>Pensée alternative {s.penseeAlternative.croyance !== null ? `(${s.penseeAlternative.croyance} %)` : ''}</h3>
          {champ(s.penseeAlternative.texte, (texte) => setEdition({ ...s, penseeAlternative: { ...s.penseeAlternative, texte } }))}
        </div>
      </div>

      <div className="actions">
        {edition ? (
          <>
            <button className="bouton discret" onClick={() => setEdition(null)}>
              Annuler
            </button>
            <button
              className="bouton"
              onClick={() => {
                props.onEnregistrer({ ...edition, majLe: new Date().toISOString() });
                setEdition(null);
              }}
            >
              Enregistrer
            </button>
          </>
        ) : (
          <>
            <button className="bouton danger" onClick={supprimer}>
              Supprimer
            </button>
            {s.statut === 'brouillon' ? (
              <button className="bouton" onClick={props.onReprendre}>
                Reprendre
              </button>
            ) : (
              <button className="bouton secondaire" onClick={() => setEdition(props.session)}>
                Modifier
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
