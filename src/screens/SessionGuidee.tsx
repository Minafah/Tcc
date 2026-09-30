// Parcours d'une session (F3 à F7) : situation → pensée → (apaisement) → questions → pensée alternative → bilan.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Respiration } from '../components/Apaisement';
import { AvantApres, Curseur, Entete, Progression, Puces } from '../components/ui';
import { BANQUES_ASSOCIEES, DISTORSIONS, DISTORSIONS_PRIORITAIRES, EMOTIONS, EMOTIONS_VERS_PROBLEMATIQUE, GABARITS, PROBLEMATIQUES, QUESTIONS, VERIFICATION, distorsion, distorsionsDe, question } from '../lib/contenu';
import { detecterCrise } from '../lib/crise';
import { evolution, messageBilan } from '../lib/bilan';
import { CLE_PIEGE, casesARemplir, composer, estComplet, segments } from '../lib/gabarits';
import { historique } from '../lib/db';
import { SEUIL_APAISEMENT, selectionnerQuestions, suggererDistorsion, suggererProfessionnel } from '../lib/moteur';
import type { Etape, Reponse, Session } from '../lib/types';

export interface PropsSession {
  session: Session;
  onChange: (s: Session) => void;
  onQuitter: () => void;
  onSos: () => void;
  /** Ouvre l'écran de crise ; `continuer` est appelé si je choisis de poursuivre. */
  onCrise: (mots: string[], continuer: () => void) => void;
}

export function SessionGuidee(props: PropsSession) {
  const { session, onChange } = props;
  // Mots de crise pour lesquels j'ai choisi de continuer : ajoutés à la session au prochain enregistrement.
  const acquittes = useRef<string[]>([]);

  const maj = (partiel: Partial<Session>) =>
    onChange({
      ...session,
      ...partiel,
      criseAcquittee: [...new Set([...session.criseAcquittee, ...acquittes.current])],
      majLe: new Date().toISOString(),
    });
  const allerA = (etape: Etape, partiel: Partial<Session> = {}) => {
    maj({ ...partiel, etape });
    window.scrollTo(0, 0);
  };

  /** Vérifie les mots de crise avant de passer à la suite (section 5.1). */
  const avancerSiSansCrise = (textes: string[], suite: () => void) => {
    const nouveaux = detecterCrise(textes).filter((m) => !session.criseAcquittee.includes(m));
    if (nouveaux.length === 0) return suite();
    props.onCrise(nouveaux, () => {
      acquittes.current.push(...nouveaux);
      suite();
    });
  };

  const commun = { ...props, maj, allerA, avancerSiSansCrise };

  switch (session.etape) {
    case 'situation':
      return <EtapeSituation {...commun} />;
    case 'pensee':
      return <EtapePensee {...commun} />;
    case 'apaisement':
      return <EtapeApaisement {...commun} />;
    case 'questions':
      return <EtapeQuestions {...commun} />;
    case 'alternative':
      return <EtapeAlternative {...commun} />;
    case 'bilan':
      return <EtapeBilan {...commun} />;
  }
}

type PropsEtape = PropsSession & {
  maj: (partiel: Partial<Session>) => void;
  allerA: (etape: Etape, partiel?: Partial<Session>) => void;
  avancerSiSansCrise: (textes: string[], suite: () => void) => void;
};

// --- Étape 1 : situation et émotion (F3, F4) ---

function EtapeSituation({ session, maj, allerA, onQuitter, onSos, avancerSiSansCrise }: PropsEtape) {
  const pret = session.situation.trim() !== '' && session.emotion.libelle !== '';

  /** Changer de problématique invalide les questions et la distorsion déjà choisies. */
  const problematiqueChangee = (problematique: string): Partial<Session> =>
    problematique === session.problematique
      ? {}
      : { problematique, questionIds: [], reponses: [], indexQuestion: 0, pensee: { ...session.pensee, distorsions: [] } };

  const choisirEmotion = (libelle: string) => {
    const proposee = PROBLEMATIQUES.find((p) => p.id === EMOTIONS_VERS_PROBLEMATIQUE[libelle] && p.active);
    maj({ emotion: { ...session.emotion, libelle }, ...(proposee ? problematiqueChangee(proposee.id) : {}) });
  };
  return (
    <div className="page">
      <Entete titre="Nouvelle pensée" onRetour={onQuitter} onSos={onSos} />
      <Progression valeur={1} max={5} />
      <div className="contenu">
        <label>
          Que se passe-t-il ?
          <textarea
            value={session.situation}
            onChange={(e) => maj({ situation: e.target.value })}
            placeholder="Où es-tu, avec qui, qu'est-ce qui vient d'arriver ?"
          />
        </label>

        <div>
          <h3>Ce que tu ressens</h3>
          <Puces
            options={EMOTIONS.map((e) => ({ valeur: e, libelle: e }))}
            valeur={session.emotion.libelle || null}
            onChange={choisirEmotion}
          />
        </div>

        <Curseur
          libelle="Intensité"
          valeur={session.emotion.intensiteAvant}
          onChange={(v) => maj({ emotion: { ...session.emotion, intensiteAvant: v } })}
          aide="0 = pas du tout, 100 = le plus fort possible"
        />

        <div>
          <h3>Problématique</h3>
          <Puces
            options={PROBLEMATIQUES.map((p) => ({
              valeur: p.id,
              libelle: p.active ? p.libelle : `${p.libelle} (bientôt)`,
              desactive: !p.active,
            }))}
            valeur={session.problematique}
            onChange={(problematique) => maj(problematiqueChangee(problematique))}
          />
        </div>
      </div>
      <div className="actions">
        <button
          className="bouton"
          disabled={!pret}
          onClick={() => avancerSiSansCrise([session.situation], () => allerA('pensee'))}
        >
          Suivant
        </button>
      </div>
    </div>
  );
}

// --- Étape 2 : pensée automatique, croyance et distorsion ---

function EtapePensee({ session, maj, allerA, onSos, avancerSiSansCrise }: PropsEtape) {
  const possibles = useMemo(() => distorsionsDe(session.problematique), [session.problematique]);
  // Règle 11.9 : certaines émotions (ex. honte) orientent d'abord vers certaines distorsions.
  const prioritaires = (DISTORSIONS_PRIORITAIRES[session.emotion.libelle] ?? []).filter((id) =>
    possibles.some((p) => p.id === id),
  );
  const suggestion = suggererDistorsion(session.pensee.texte, possibles) ?? prioritaires[0] ?? null;
  // Distorsion choisie par moi ; « auto » = laisser l'application proposer.
  const [choix, setChoix] = useState<string>(session.pensee.distorsions[0] ?? '');
  const [calcul, setCalcul] = useState(false);
  const d = choix && choix !== 'auto' ? distorsion(choix) : undefined;

  const suivant = async () => {
    setCalcul(true);
    let { questionIds, reponses, pensee } = session;
    const dejaChoisie = choix !== 'auto' && choix !== '' && choix === pensee.distorsions[0];
    if (questionIds.length === 0 || !dejaChoisie) {
      const selection = selectionnerQuestions({
        questions: QUESTIONS,
        problematique: session.problematique,
        distorsion: choix && choix !== 'auto' ? choix : null,
        distorsionsPossibles: prioritaires.length > 0 ? prioritaires : possibles.map((x) => x.id),
        historique: await historique(),
        problematiquesAssociees: BANQUES_ASSOCIEES[session.problematique],
      });
      questionIds = selection.questionIds;
      pensee = { ...pensee, distorsions: [selection.distorsion] };
      // On garde les réponses déjà écrites aux questions qui restent.
      reponses = questionIds.map(
        (id) => session.reponses.find((r) => r.questionId === id) ?? { questionId: id, texte: '', utile: null, passee: false },
      );
      setChoix(selection.distorsion);
    }
    setCalcul(false);
    const etape = session.emotion.intensiteAvant >= SEUIL_APAISEMENT ? 'apaisement' : 'questions';
    allerA(etape, { questionIds, reponses, pensee, indexQuestion: 0 });
  };

  return (
    <div className="page">
      <Entete titre="Ta pensée" onRetour={() => allerA('situation')} onSos={onSos} />
      <Progression valeur={2} max={5} />
      <div className="contenu">
        <label>
          Quelle pensée te traverse l'esprit ?
          <textarea
            value={session.pensee.texte}
            onChange={(e) => maj({ pensee: { ...session.pensee, texte: e.target.value } })}
            placeholder="Écris-la telle qu'elle vient, avec tes mots."
          />
        </label>

        <Curseur
          libelle="À quel point tu y crois"
          unite=" %"
          valeur={session.pensee.croyanceAvant}
          onChange={(v) => maj({ pensee: { ...session.pensee, croyanceAvant: v } })}
        />

        <div>
          <h3>Ça ressemble à quel type de pensée ?</h3>
          {suggestion && suggestion !== choix ? (
            <p className="encart petit" style={{ marginBottom: 10 }}>
              Ça ressemble peut-être à <strong>{distorsion(suggestion)?.libelle}</strong>.{' '}
              <button className="puce" style={{ minHeight: 32, marginLeft: 4 }} onClick={() => setChoix(suggestion)}>
                Choisir
              </button>
            </p>
          ) : null}
          <Puces
            options={[
              ...possibles.map((x) => ({ valeur: x.id, libelle: x.libelle })),
              { valeur: 'auto', libelle: 'Je ne sais pas' },
            ]}
            valeur={choix || null}
            onChange={setChoix}
          />
          {d ? (
            <p className="doux petit" style={{ marginTop: 10 }}>
              {d.definition} Exemple : {d.exemple}
            </p>
          ) : choix === 'auto' ? (
            <p className="doux petit" style={{ marginTop: 10 }}>
              L'application choisira un angle que tu as peu exploré récemment.
            </p>
          ) : null}
        </div>
      </div>
      <div className="actions">
        <button
          className="bouton"
          disabled={session.pensee.texte.trim() === '' || choix === '' || calcul}
          onClick={() => avancerSiSansCrise([session.pensee.texte], suivant)}
        >
          Suivant
        </button>
      </div>
    </div>
  );
}

// --- Étape optionnelle : apaisement si l'émotion est très forte (règle 3.4.6) ---

function EtapeApaisement({ allerA, onSos }: PropsEtape) {
  return (
    <div className="page">
      <Entete titre="Un moment pour souffler" onRetour={() => allerA('pensee')} onSos={onSos} />
      <div className="contenu">
        <p>
          Ton émotion est très forte en ce moment. Avant de questionner la pensée, prends une minute pour laisser ton corps
          se poser un peu.
        </p>
        <Respiration />
      </div>
      <div className="actions">
        <button className="bouton discret" onClick={() => allerA('questions')}>
          Passer
        </button>
        <button className="bouton" onClick={() => allerA('questions')}>
          Je suis prêt·e
        </button>
      </div>
    </div>
  );
}

// --- Étape 3 : questionnement guidé, une question par écran (F5) ---

function EtapeQuestions({ session, maj, allerA, onSos, avancerSiSansCrise }: PropsEtape) {
  const i = session.indexQuestion;
  const total = session.questionIds.length;
  const q = question(session.questionIds[i]);
  const reponse = session.reponses[i];

  if (!q || !reponse) {
    // Contenu modifié depuis le brouillon : on refait la sélection.
    return (
      <div className="page">
        <div className="contenu">
          <p>Les questions de cette session ne sont plus disponibles.</p>
          <button className="bouton" onClick={() => allerA('pensee', { questionIds: [] })}>
            Choisir de nouvelles questions
          </button>
        </div>
      </div>
    );
  }

  const majReponse = (partiel: Partial<Reponse>) => {
    const reponses = [...session.reponses];
    reponses[i] = { ...reponse, ...partiel };
    maj({ reponses });
  };

  const aller = (index: number, reponses = session.reponses) => {
    window.scrollTo(0, 0);
    if (index < 0) return allerA('pensee', { reponses });
    if (index >= total) return allerA('alternative', { reponses, indexQuestion: total - 1 });
    maj({ indexQuestion: index, reponses });
  };

  const passer = () => {
    const reponses = [...session.reponses];
    reponses[i] = { ...reponse, passee: true };
    aller(i + 1, reponses);
  };

  const repondre = () => {
    const reponses = [...session.reponses];
    reponses[i] = { ...reponse, passee: false };
    avancerSiSansCrise([reponse.texte], () => aller(i + 1, reponses));
  };

  const typeQuestion =
    q.categorie === 'depart'
      ? 'Pour commencer'
      : q.categorie === 'cloture'
        ? 'Pour prendre du recul'
        : // Une question empruntée à une autre distorsion affiche son propre type.
          distorsion(q.distorsions.includes(session.pensee.distorsions[0]) ? session.pensee.distorsions[0] : q.distorsions[0])?.libelle;

  return (
    <div className="page">
      <Entete titre={`Question ${i + 1} sur ${total}`} onRetour={() => aller(i - 1)} onSos={onSos} />
      <Progression valeur={i + 1} max={total} />
      <div className="contenu">
        <p className="doux petit">{typeQuestion}</p>
        <p className="question">{q.texte}</p>
        <textarea
          key={q.id}
          value={reponse.texte}
          onChange={(e) => majReponse({ texte: e.target.value })}
          placeholder="Ta réponse, même courte…"
          aria-label="Ta réponse"
        />
        <div className="puces" role="group" aria-label="Cette question t'a-t-elle aidé ?">
          <span className="doux petit" style={{ width: '100%' }}>
            Cette question t'aide ?
          </span>
          <button className="puce" aria-pressed={reponse.utile === true} onClick={() => majReponse({ utile: reponse.utile === true ? null : true })}>
            👍 Utile
          </button>
          <button className="puce" aria-pressed={reponse.utile === false} onClick={() => majReponse({ utile: reponse.utile === false ? null : false })}>
            👎 Pas utile
          </button>
        </div>
      </div>
      <div className="actions">
        <button className="bouton discret" onClick={passer}>
          Passer
        </button>
        <button className="bouton" onClick={repondre} disabled={reponse.texte.trim() === ''}>
          Suivant
        </button>
      </div>
    </div>
  );
}

// --- Étape 4 : pensée alternative et réévaluation (F6) ---
// Un petit atelier guidé : je choisis un chemin, je réponds à quelques questions douces,
// et la phrase se construit toute seule. Aucun crochet à remplacer à la main.

function emojiIntensite(v: number): string {
  if (v <= 20) return '😌';
  if (v <= 40) return '🙂';
  if (v <= 60) return '😐';
  if (v <= 80) return '😟';
  return '😣';
}

function EtapeAlternative({ session, maj, allerA, onSos, avancerSiSansCrise }: PropsEtape) {
  const gabarits = GABARITS[session.problematique] ?? [];
  const verification = VERIFICATION[session.problematique] ?? [];
  const alt = session.penseeAlternative;
  const typeChoisi = distorsion(session.pensee.distorsions[0])?.libelle;
  // Un ancien brouillon sans chemin mais avec du texte s'ouvre en « mes propres mots ».
  const chemin = alt.gabarit ?? (alt.texte.trim() ? -1 : undefined);
  const g = chemin !== undefined && chemin >= 0 ? gabarits[chemin] : undefined;
  const valeurs = alt.champs ?? {};
  const cases = g ? casesARemplir(g) : [];
  const remplies = cases.filter((c) => (valeurs[c] ?? '').trim() !== '').length;
  const pret = g ? estComplet(g, valeurs) : chemin === -1 && alt.texte.trim() !== '';

  const croyanceAlt = alt.croyance ?? 50;
  const croyanceApres = session.pensee.croyanceApres ?? session.pensee.croyanceAvant;
  const intensiteApres = session.emotion.intensiteApres ?? session.emotion.intensiteAvant;
  const reponsesEcrites = session.reponses.filter((r) => r.texte.trim() !== '');

  const choisirChemin = (i: number) =>
    maj({
      penseeAlternative: { ...alt, gabarit: i, champs: {}, texte: i >= 0 ? composer(gabarits[i], {}, typeChoisi) : '' },
    });
  const changerChemin = () => maj({ penseeAlternative: { ...alt, gabarit: undefined, champs: {}, texte: '' } });
  const retoucher = () => maj({ penseeAlternative: { ...alt, gabarit: -1 } });
  const majCase = (cle: string, v: string) => {
    if (!g) return;
    const champs = { ...valeurs, [cle]: v };
    maj({ penseeAlternative: { ...alt, champs, texte: composer(g, champs, typeChoisi) } });
  };
  const allerALaCase = (cle: string) => document.getElementById(`case-${cle}`)?.focus();

  const terminer = () =>
    avancerSiSansCrise([alt.texte], () =>
      allerA('bilan', {
        statut: 'terminee',
        penseeAlternative: { ...alt, croyance: croyanceAlt },
        pensee: { ...session.pensee, croyanceApres },
        emotion: { ...session.emotion, intensiteApres },
      }),
    );

  return (
    <div className="page">
      <Entete
        titre="Une pensée plus juste"
        onRetour={() => allerA('questions', { indexQuestion: session.questionIds.length - 1 })}
        onSos={onSos}
      />
      <Progression valeur={4} max={5} />
      <div className="contenu">
        <div className="encart">
          <p>
            🌿 <strong>Tu as fait le plus dur.</strong> Maintenant, construisons ensemble une pensée plus douce et plus
            juste. Elle n'a pas besoin d'être parfaite, juste un peu plus proche de la réalité.
          </p>
        </div>

        <details className="carte">
          <summary>Ta pensée de départ{reponsesEcrites.length > 0 ? ' et tes réponses' : ''}</summary>
          <p>« {session.pensee.texte} »</p>
          {reponsesEcrites.map((r) => (
            <div key={r.questionId}>
              <p className="doux petit">{question(r.questionId)?.texte}</p>
              <p>{r.texte}</p>
            </div>
          ))}
        </details>

        {chemin === undefined ? (
          <div>
            <h3>Par où veux-tu commencer ?</h3>
            <p className="doux petit" style={{ marginBottom: 10 }}>
              Choisis le chemin qui te parle le plus. Tu pourras en changer.
            </p>
            <div className="liste">
              {gabarits.map((x, i) => (
                <button key={x.titre} className="carte carte-cliquable chemin" onClick={() => choisirChemin(i)}>
                  <span className="chemin-emoji" aria-hidden="true">
                    {x.emoji}
                  </span>
                  <span>
                    <strong>{x.titre}</strong>
                    <span className="doux petit" style={{ display: 'block' }}>
                      {composer(x, {}, typeChoisi)}
                    </span>
                  </span>
                </button>
              ))}
              <button className="carte carte-cliquable chemin" onClick={() => choisirChemin(-1)}>
                <span className="chemin-emoji" aria-hidden="true">
                  ✍️
                </span>
                <span>
                  <strong>Avec mes propres mots</strong>
                  <span className="doux petit" style={{ display: 'block' }}>
                    J'écris librement ma nouvelle pensée.
                  </span>
                </span>
              </button>
            </div>
          </div>
        ) : null}

        {g ? (
          <>
            <div className="carte phrase-vivante" aria-live="polite">
              <p className="doux petit">
                {g.emoji} {g.titre}
              </p>
              <p className="phrase">
                {segments(g, valeurs, typeChoisi).map((m, i) => {
                  if ('texte' in m) return <span key={i}>{m.texte}</span>;
                  if (m.cle === CLE_PIEGE) return <span key={i} className="case">{m.valeur}</span>;
                  return (
                    // Un <span> (et non un <button>) pour que la case s'écoule dans la phrase comme du texte.
                    <span
                      key={i}
                      role="button"
                      tabIndex={0}
                      className={`case${m.valeur ? '' : ' vide'}`}
                      onClick={() => allerALaCase(m.cle)}
                      onKeyDown={(e) => e.key === 'Enter' && allerALaCase(m.cle)}
                    >
                      {m.valeur || '…'}
                    </span>
                  );
                })}
              </p>
              <p className="doux petit">
                {pret ? '✨ Ta nouvelle pensée est prête. Relis-la doucement.' : `${remplies} case${remplies > 1 ? 's' : ''} sur ${cases.length} remplie${remplies > 1 ? 's' : ''}`}
              </p>
            </div>

            {cases.map((cle) => (
              <label key={cle}>
                {g.champs[cle]?.question ?? cle}
                <input
                  id={`case-${cle}`}
                  type="text"
                  value={valeurs[cle] ?? ''}
                  onChange={(e) => majCase(cle, e.target.value)}
                  placeholder={`ex. : ${g.champs[cle]?.exemple ?? ''}`}
                  autoComplete="off"
                />
              </label>
            ))}

            <div className="puces">
              <button className="puce" onClick={changerChemin}>
                ↩︎ Changer de chemin
              </button>
              {pret ? (
                <button className="puce" onClick={retoucher}>
                  ✍️ Retoucher avec mes mots
                </button>
              ) : null}
            </div>
          </>
        ) : null}

        {chemin === -1 ? (
          <>
            <label>
              ✍️ Ta nouvelle pensée, avec tes mots
              <textarea
                value={alt.texte}
                onChange={(e) => maj({ penseeAlternative: { ...alt, texte: e.target.value } })}
                placeholder="Une façon un peu plus douce et plus juste de voir la situation…"
              />
            </label>
            <div className="puces">
              <button className="puce" onClick={changerChemin}>
                ↩︎ Changer de chemin
              </button>
            </div>
          </>
        ) : null}

        {pret ? (
          <>
            <details className="carte">
              <summary>💭 Petit check-up avant de valider</summary>
              <ul className="doux">
                {verification.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            </details>

            <h3>Et maintenant, où en es-tu ?</h3>
            <Curseur
              libelle="Tu crois à ta nouvelle pensée"
              unite=" %"
              valeur={croyanceAlt}
              onChange={(v) => maj({ penseeAlternative: { ...alt, croyance: v } })}
            />
            <Curseur
              libelle="Tu crois encore à ta pensée de départ"
              unite=" %"
              valeur={croyanceApres}
              onChange={(v) => maj({ pensee: { ...session.pensee, croyanceApres: v } })}
            />
            <Curseur
              libelle={`${session.emotion.libelle || 'Ton émotion'} en ce moment`}
              valeur={intensiteApres}
              emoji={emojiIntensite(intensiteApres)}
              onChange={(v) => maj({ emotion: { ...session.emotion, intensiteApres: v } })}
            />
          </>
        ) : null}
      </div>
      {pret ? (
        <div className="actions">
          <button className="bouton" onClick={terminer}>
            Voir mon bilan ✨
          </button>
        </div>
      ) : null}
    </div>
  );
}

// --- Étape 5 : bilan de session (F7) ---

function EtapeBilan({ session, onQuitter, onSos }: PropsEtape) {
  const [voirPro, setVoirPro] = useState(false);
  useEffect(() => {
    historique().then((h) => setVoirPro(suggererProfessionnel(h)));
  }, []);

  const avant = session.emotion.intensiteAvant;
  const apres = session.emotion.intensiteApres ?? avant;
  const croyanceAvant = session.pensee.croyanceAvant;
  const croyanceApres = session.pensee.croyanceApres ?? croyanceAvant;
  const d = DISTORSIONS.find((x) => x.id === session.pensee.distorsions[0]);

  return (
    <div className="page">
      <Entete titre="Bilan" onSos={onSos} />
      <Progression valeur={5} max={5} />
      <div className="contenu">
        <h2>Bilan de ta session</h2>
        <p>{messageBilan(session)}</p>

        <div className="carte">
          <h3>En résumé</h3>
          <ul className="recap">
            {d ? (
              <li>
                <span className="doux petit">Piège de pensée travaillé</span>
                <strong>{d.libelle}</strong>
                <span className="doux petit">{d.definition}</span>
              </li>
            ) : null}
            <li>
              <span className="doux petit">{session.emotion.libelle || 'Émotion'}</span>
              <strong>{evolution(avant, apres)}</strong>
              <AvantApres avant={avant} apres={apres} />
            </li>
            <li>
              <span className="doux petit">Croyance dans ta pensée de départ</span>
              <strong>{evolution(croyanceAvant, croyanceApres, ' %')}</strong>
              <AvantApres avant={croyanceAvant} apres={croyanceApres} unite=" %" />
            </li>
            {session.penseeAlternative.croyance !== null ? (
              <li>
                <span className="doux petit">Croyance dans ta nouvelle pensée</span>
                <strong>{session.penseeAlternative.croyance} %</strong>
              </li>
            ) : null}
          </ul>
        </div>

        <div className="carte">
          <p className="doux petit">Ta pensée de départ</p>
          <p>« {session.pensee.texte} »</p>
          <p className="doux petit">Ta nouvelle pensée</p>
          <p style={{ whiteSpace: 'pre-line' }}>« {session.penseeAlternative.texte} »</p>
        </div>

        {voirPro ? (
          <div className="encart">
            <p>
              Ces derniers temps, ton émotion reste très forte après tes sessions. En parler à un professionnel (médecin,
              psychologue) pourrait t'apporter un soutien que cette application ne peut pas offrir.
            </p>
          </div>
        ) : null}
      </div>
      <div className="actions">
        <button className="bouton" onClick={onQuitter}>
          Terminer
        </button>
      </div>
    </div>
  );
}
