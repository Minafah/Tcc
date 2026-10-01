// Journal (F8) : liste, recherche, filtre, détail, modification et suppression.
import { useMemo, useState } from 'react';
import { AvantApres, Entete } from '../components/ui';
import { PROBLEMATIQUES, distorsion, question } from '../lib/contenu';
import { formaterDate, textesLibres } from '../lib/session';
import { normaliser } from '../lib/texte';
import type { Session } from '../lib/types';

export function Journal(props: {
  sessions: Session[];
  onOuvrir: (id: string) => void;
  onSupprimer: (ids: string[]) => void;
  onRetour: () => void;
  onSos: () => void;
}) {
  const [recherche, setRecherche] = useState('');
  // Mode sélection : cocher plusieurs sessions pour les supprimer d'un coup.
  const [selection, setSelection] = useState<Set<string> | null>(null);
  const [emotion, setEmotion] = useState('');
  const [problematique, setProblematique] = useState('');
  const problematiques = PROBLEMATIQUES.filter((p) => props.sessions.some((s) => s.problematique === p.id));
  const emotions = useMemo(
    () => [...new Set(props.sessions.map((s) => s.emotion.libelle).filter(Boolean))].sort(),
    [props.sessions],
  );

  const filtrees = props.sessions.filter((s) => {
    if (emotion && s.emotion.libelle !== emotion) return false;
    if (problematique && s.problematique !== problematique) return false;
    if (!recherche.trim()) return true;
    return normaliser(textesLibres(s).join(' ')).includes(normaliser(recherche));
  });

  const basculer = (id: string) => {
    if (!selection) return;
    const suivante = new Set(selection);
    if (suivante.has(id)) suivante.delete(id);
    else suivante.add(id);
    setSelection(suivante);
  };

  const supprimerSelection = () => {
    if (!selection || selection.size === 0) return;
    const n = selection.size;
    if (!confirm(`Supprimer définitivement ${n > 1 ? `ces ${n} sessions` : 'cette session'} ?`)) return;
    props.onSupprimer([...selection]);
    setSelection(null);
  };

  return (
    <div className="page">
      <Entete
        titre="Mon journal"
        onRetour={props.onRetour}
        onSos={props.onSos}
        droite={
          props.sessions.length > 0 ? (
            <button className="puce" onClick={() => setSelection(selection ? null : new Set())}>
              {selection ? 'Annuler' : 'Sélectionner'}
            </button>
          ) : null
        }
      />
      <div className="contenu">
        <input type="search" placeholder="Rechercher…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
        {problematiques.length > 1 ? (
          <select value={problematique} onChange={(e) => setProblematique(e.target.value)} aria-label="Filtrer par problématique">
            <option value="">Toutes les problématiques</option>
            {problematiques.map((p) => (
              <option key={p.id} value={p.id}>
                {p.libelle}
              </option>
            ))}
          </select>
        ) : null}
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
              <button
                key={s.id}
                className={`carte carte-cliquable${selection?.has(s.id) ? ' selectionnee' : ''}`}
                onClick={() => (selection ? basculer(s.id) : props.onOuvrir(s.id))}
                aria-pressed={selection ? selection.has(s.id) : undefined}
              >
                <span className="doux petit">
                  {selection ? <span aria-hidden="true">{selection.has(s.id) ? '☑︎ ' : '☐ '}</span> : null}
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
      {selection ? (
        <div className="actions">
          <button
            className="bouton discret"
            onClick={() => setSelection(selection.size === filtrees.length ? new Set() : new Set(filtrees.map((s) => s.id)))}
          >
            {selection.size === filtrees.length && filtrees.length > 0 ? 'Tout désélectionner' : 'Tout sélectionner'}
          </button>
          <button className="bouton danger" disabled={selection.size === 0} onClick={supprimerSelection}>
            Supprimer{selection.size > 0 ? ` (${selection.size})` : ''}
          </button>
        </div>
      ) : null}
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
