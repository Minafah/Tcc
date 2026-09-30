// Premier lancement (F1).
import { useState } from 'react';

const PAGES = [
  {
    titre: 'Prendre du recul sur une pensée',
    texte: [
      "Quand une émotion forte arrive, on a souvent une pensée automatique qui l'accompagne : « ça va mal se passer », « il pense que je suis nul »…",
      "Cette application te guide pas à pas pour l'examiner, avec la méthode de la restructuration cognitive (TCC) : la situation, l'émotion, la pensée, quelques questions, puis une pensée plus juste.",
    ],
  },
  {
    titre: 'Une session prend quelques minutes',
    texte: [
      "Tu notes l'intensité de ton émotion et ta croyance dans la pensée avant et après : tu vois ce qui a bougé.",
      'Tu peux passer une question, marquer celles qui t\'aident, et reprendre plus tard : tout est enregistré au fur et à mesure.',
      "Pour l'instant, l'application couvre l'anxiété, la colère et la culpabilité.",
    ],
  },
  {
    titre: 'Important',
    texte: [
      "Cette application est un outil d'auto-assistance. Elle ne remplace pas un médecin ou un psychologue, et ne pose aucun diagnostic.",
      'Le bouton SOS, en haut de chaque écran, donne accès en un geste aux numéros d\'urgence (3114, 15, 112) et à un exercice d\'apaisement.',
      "Tes données restent sur ce téléphone, rien n'est envoyé nulle part. Pense à faire une sauvegarde de temps en temps (Réglages).",
    ],
  },
];

export function Onboarding(props: { onTermine: () => void }) {
  const [page, setPage] = useState(0);
  const p = PAGES[page];
  const derniere = page === PAGES.length - 1;
  return (
    <div className="page">
      <div className="contenu" style={{ justifyContent: 'center' }}>
        <p className="doux petit">
          {page + 1} / {PAGES.length}
        </p>
        <h2>{p.titre}</h2>
        {p.texte.map((t) => (
          <p key={t}>{t}</p>
        ))}
      </div>
      <div className="actions">
        {page > 0 ? (
          <button className="bouton discret" onClick={() => setPage(page - 1)}>
            Retour
          </button>
        ) : null}
        <button className="bouton" onClick={() => (derniere ? props.onTermine() : setPage(page + 1))}>
          {derniere ? "J'ai compris, commencer" : 'Suivant'}
        </button>
      </div>
    </div>
  );
}
