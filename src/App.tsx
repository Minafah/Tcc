// Point d'entrée de l'interface : navigation entre écrans, verrouillage, SOS, enregistrement automatique.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  brouillonEnCours,
  effacerTout,
  enregistrerReglages,
  enregistrerSession,
  listerSessions,
  lireReglages,
  supprimerSession,
} from './lib/db';
import { nouvelleSession } from './lib/session';
import { REGLAGES_DEFAUT, type Reglages as TReglages, type Session } from './lib/types';
import { Accueil } from './screens/Accueil';
import { DetailSession, Journal } from './screens/Journal';
import { Onboarding } from './screens/Onboarding';
import { Reglages } from './screens/Reglages';
import { SessionGuidee } from './screens/SessionGuidee';
import { Sos } from './screens/Sos';
import { Verrou } from './screens/Verrou';

type Vue = { nom: 'accueil' } | { nom: 'session' } | { nom: 'journal' } | { nom: 'detail'; id: string } | { nom: 'reglages' };

type EtatSos = null | { mode: 'sos' } | { mode: 'crise'; continuer: () => void };

/** Un brouillon plus récent que ce délai est rouvert directement au lancement. */
const REPRISE_AUTO_MS = 12 * 60 * 60 * 1000;
/** Temps en arrière-plan au-delà duquel l'application se reverrouille. */
const REVERROUILLAGE_MS = 60 * 1000;

export function App() {
  const [charge, setCharge] = useState(false);
  const [reglages, setReglages] = useState<TReglages>(REGLAGES_DEFAUT);
  const [verrouille, setVerrouille] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [courante, setCourante] = useState<Session | null>(null);
  const [vue, setVue] = useState<Vue>({ nom: 'accueil' });
  const [sos, setSos] = useState<EtatSos>(null);
  const cacheLe = useRef<number | null>(null);

  const rafraichir = useCallback(async () => setSessions(await listerSessions()), []);

  // Chargement initial.
  useEffect(() => {
    (async () => {
      const r = await lireReglages();
      setReglages(r);
      setVerrouille(r.verrouillage !== null);
      await rafraichir();
      const brouillon = await brouillonEnCours();
      if (brouillon && Date.now() - Date.parse(brouillon.majLe) < REPRISE_AUTO_MS) {
        setCourante(brouillon);
        setVue({ nom: 'session' });
      }
      setCharge(true);
    })();
  }, [rafraichir]);

  // Reverrouillage après un passage en arrière-plan.
  useEffect(() => {
    const surVisibilite = () => {
      if (document.visibilityState === 'hidden') cacheLe.current = Date.now();
      else if (cacheLe.current && reglages.verrouillage && Date.now() - cacheLe.current > REVERROUILLAGE_MS) {
        setVerrouille(true);
      }
    };
    document.addEventListener('visibilitychange', surVisibilite);
    return () => document.removeEventListener('visibilitychange', surVisibilite);
  }, [reglages.verrouillage]);

  const majReglages = async (r: TReglages) => {
    setReglages(r);
    await enregistrerReglages(r);
  };

  /** Enregistrement automatique à chaque modification (aucune perte en cas de fermeture). */
  const majSession = (s: Session) => {
    setCourante(s);
    setSessions((liste) => [s, ...liste.filter((x) => x.id !== s.id)].sort((a, b) => b.date.localeCompare(a.date)));
    enregistrerSession(s);
  };

  const quitterSession = async () => {
    // Une session abandonnée sans rien saisir n'encombre pas le journal.
    if (courante && courante.statut === 'brouillon' && !courante.situation.trim() && !courante.pensee.texte.trim()) {
      await supprimerSession(courante.id);
    }
    setCourante(null);
    setVue({ nom: 'accueil' });
    await rafraichir();
  };

  const ouvrirSos = () => setSos({ mode: 'sos' });

  if (!charge) return null;

  const personnes = reglages.personnesConfiance;
  const superposition = sos ? (
    <Sos
      mode={sos.mode}
      personnes={personnes}
      onFermer={() => setSos(null)}
      onContinuer={() => {
        if (sos.mode === 'crise') sos.continuer();
        setSos(null);
      }}
      onArreter={() => {
        setSos(null);
        setCourante(null);
        setVue({ nom: 'accueil' });
      }}
    />
  ) : null;

  if (!reglages.onboardingFait) {
    return <Onboarding onTermine={() => majReglages({ ...reglages, onboardingFait: true })} />;
  }

  if (verrouille && reglages.verrouillage) {
    return (
      <>
        <Verrou verrouillage={reglages.verrouillage} onDeverrouille={() => setVerrouille(false)} onSos={ouvrirSos} />
        {superposition}
      </>
    );
  }

  let ecran;
  switch (vue.nom) {
    case 'session':
      ecran = courante ? (
        <SessionGuidee
          session={courante}
          onChange={majSession}
          onQuitter={quitterSession}
          onSos={ouvrirSos}
          onCrise={(_mots, continuer) => setSos({ mode: 'crise', continuer })}
        />
      ) : null;
      break;
    case 'journal':
      ecran = (
        <Journal
          sessions={sessions}
          onOuvrir={(id) => setVue({ nom: 'detail', id })}
          onRetour={() => setVue({ nom: 'accueil' })}
          onSos={ouvrirSos}
        />
      );
      break;
    case 'detail': {
      const s = sessions.find((x) => x.id === vue.id);
      ecran = s ? (
        <DetailSession
          key={s.id}
          session={s}
          onEnregistrer={majSession}
          onSupprimer={async () => {
            await supprimerSession(s.id);
            await rafraichir();
            setVue({ nom: 'journal' });
          }}
          onReprendre={() => {
            setCourante(s);
            setVue({ nom: 'session' });
          }}
          onRetour={() => setVue({ nom: 'journal' })}
          onSos={ouvrirSos}
        />
      ) : null;
      break;
    }
    case 'reglages':
      ecran = (
        <Reglages
          reglages={reglages}
          onChange={majReglages}
          onDonneesRestaurees={async () => {
            setReglages(await lireReglages());
            await rafraichir();
          }}
          onToutEffacer={async () => {
            await effacerTout();
            setReglages(REGLAGES_DEFAUT);
            setSessions([]);
            setVue({ nom: 'accueil' });
          }}
          onRevoirPresentation={() => majReglages({ ...reglages, onboardingFait: false })}
          onRetour={() => setVue({ nom: 'accueil' })}
          onSos={ouvrirSos}
        />
      );
      break;
  }

  if (!ecran) {
    const brouillon = sessions.find((s) => s.statut === 'brouillon');
    const derniere = sessions.find((s) => s.statut === 'terminee');
    ecran = (
      <Accueil
        brouillon={brouillon}
        derniere={derniere}
        onNouvelle={() => {
          const s = nouvelleSession();
          setCourante(s);
          setVue({ nom: 'session' });
        }}
        onReprendre={() => {
          if (!brouillon) return;
          setCourante(brouillon);
          setVue({ nom: 'session' });
        }}
        onJournal={() => setVue({ nom: 'journal' })}
        onReglages={() => setVue({ nom: 'reglages' })}
        onSos={ouvrirSos}
      />
    );
  }

  return (
    <>
      {ecran}
      {superposition}
    </>
  );
}
