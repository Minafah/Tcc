// Parcours d'une session (F3 à F7) : situation → pensée → (apaisement) → questions → pensée alternative → bilan.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Respiration } from '../components/Apaisement';
import { AvantApres, Curseur, Entete, Progression, Puces } from '../components/ui';
import { DISTORSIONS, EMOTIONS, GABARITS, PROBLEMATIQUES, QUESTIONS, VERIFICATION, distorsion, distorsionsDe, question } from '../lib/contenu';
import { detecterCrise } from '../lib/crise';
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
            onChange={(libelle) => maj({ emotion: { ...session.emotion, libelle } })}
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
            onChange={(problematique) => maj({ problematique, questionIds: [] })}
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
  const suggestion = useMemo(() => suggererDistorsion(session.pensee.texte, possibles), [session.pensee.texte, possibles]);
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
        distorsionsPossibles: possibles.map((x) => x.id),
        historique: await historique(),
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
    q.categorie === 'depart' ? 'Pour commencer' : q.categorie === 'cloture' ? 'Pour prendre du recul' : distorsion(session.pensee.distorsions[0])?.libelle;

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

function EtapeAlternative({ session, maj, allerA, onSos, avancerSiSansCrise }: PropsEtape) {
  const gabarits = GABARITS[session.problematique] ?? [];
  const verification = VERIFICATION[session.problematique] ?? [];
  const alt = session.penseeAlternative;
  const croyanceAlt = alt.croyance ?? 50;
  const croyanceApres = session.pensee.croyanceApres ?? session.pensee.croyanceAvant;
  const intensiteApres = session.emotion.intensiteApres ?? session.emotion.intensiteAvant;
  const reponsesEcrites = session.reponses.filter((r) => r.texte.trim() !== '');

  const utiliserGabarit = (g: string) => {
    const nomDistorsion = distorsion(session.pensee.distorsions[0])?.libelle.toLowerCase();
    const texte = nomDistorsion ? g.replace('[distorsion identifiée]', nomDistorsion) : g;
    maj({ penseeAlternative: { ...alt, texte: alt.texte ? `${alt.texte}\n${texte}` : texte } });
  };

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
          <p className="doux petit">Ta pensée de départ</p>
          <p>« {session.pensee.texte} »</p>
        </div>

        {reponsesEcrites.length > 0 ? (
          <details className="carte">
            <summary>Relire mes réponses</summary>
            {reponsesEcrites.map((r) => (
              <div key={r.questionId}>
                <p className="doux petit">{question(r.questionId)?.texte}</p>
                <p>{r.texte}</p>
              </div>
            ))}
          </details>
        ) : null}

        <div>
          <h3>Pour t'aider à formuler</h3>
          <p className="doux petit" style={{ marginBottom: 8 }}>
            Touche un modèle pour l'ajouter, puis remplace les passages entre crochets. Le but n'est pas de « penser positif
            », mais d'être aussi réaliste que possible.
          </p>
          <div className="liste">
            {gabarits.map((g) => (
              <button key={g} className="carte carte-cliquable petit" onClick={() => utiliserGabarit(g)}>
                {g}
              </button>
            ))}
          </div>
        </div>

        <label>
          Ma pensée alternative
          <textarea
            value={alt.texte}
            onChange={(e) => maj({ penseeAlternative: { ...alt, texte: e.target.value } })}
            placeholder="Une façon plus équilibrée de voir la situation…"
          />
        </label>

        <details className="carte">
          <summary>Vérifier avant de valider</summary>
          <ul className="doux">
            {verification.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        </details>

        <Curseur
          libelle="Je crois à cette nouvelle pensée"
          unite=" %"
          valeur={croyanceAlt}
          onChange={(v) => maj({ penseeAlternative: { ...alt, croyance: v } })}
        />
        <Curseur
          libelle="Je crois maintenant à la pensée de départ"
          unite=" %"
          valeur={croyanceApres}
          onChange={(v) => maj({ pensee: { ...session.pensee, croyanceApres: v } })}
        />
        <Curseur
          libelle={`${session.emotion.libelle} maintenant`}
          valeur={intensiteApres}
          onChange={(v) => maj({ emotion: { ...session.emotion, intensiteApres: v } })}
        />
      </div>
      <div className="actions">
        <button className="bouton" disabled={alt.texte.trim() === ''} onClick={terminer}>
          Voir mon bilan
        </button>
      </div>
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
  const ecart = avant - apres;
  const d = DISTORSIONS.find((x) => x.id === session.pensee.distorsions[0]);

  return (
    <div className="page">
      <Entete titre="Bilan" onSos={onSos} />
      <Progression valeur={5} max={5} />
      <div className="contenu">
        <h2>Tu as pris le temps de regarder cette pensée de plus près.</h2>
        <p className="doux">
          {ecart > 0
            ? `Ton émotion est passée de ${avant} à ${apres}.`
            : "L'émotion met parfois du temps à redescendre. Le travail que tu viens de faire compte quand même."}
        </p>

        <div className="carte">
          <AvantApres titre={session.emotion.libelle} avant={avant} apres={apres} />
          <AvantApres titre="Croyance dans la pensée de départ" avant={session.pensee.croyanceAvant} apres={session.pensee.croyanceApres} unite=" %" />
        </div>

        <div className="carte">
          <p className="doux petit">Pensée de départ</p>
          <p>« {session.pensee.texte} »</p>
          <p className="doux petit">Pensée alternative ({session.penseeAlternative.croyance ?? '–'} %)</p>
          <p>« {session.penseeAlternative.texte} »</p>
          {d ? <p className="doux petit">Type de pensée exploré : {d.libelle}</p> : null}
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
