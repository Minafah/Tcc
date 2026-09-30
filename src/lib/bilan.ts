// Phrases récapitulatives du bilan de session (F7) : neutres, sans note ni jugement.
import type { Session } from './types';

/** « de 70 à 35 (−35 points) », « 50 %, sans changement pour l'instant », « de 40 % à 55 % (+15 points) ». */
export function evolution(avant: number, apres: number, unite = ''): string {
  const ecart = apres - avant;
  if (ecart === 0) return `${avant}${unite}, sans changement pour l'instant`;
  const signe = ecart < 0 ? '−' : '+';
  const points = Math.abs(ecart);
  return `de ${avant}${unite} à ${apres}${unite} (${signe}${points} point${points > 1 ? 's' : ''})`;
}

/** Message d'accompagnement, selon ce qui a bougé pendant la session. */
export function messageBilan(s: Session): string {
  const emotionAvant = s.emotion.intensiteAvant;
  const emotionApres = s.emotion.intensiteApres ?? emotionAvant;
  const croyanceAvant = s.pensee.croyanceAvant;
  const croyanceApres = s.pensee.croyanceApres ?? croyanceAvant;

  if (emotionApres < emotionAvant) {
    return 'Prendre du recul sur cette pensée a fait bouger quelque chose.';
  }
  if (croyanceApres < croyanceAvant) {
    return "L'émotion est encore là, mais tu crois moins à ta pensée de départ. C'est souvent comme ça que les choses commencent à bouger.";
  }
  if (emotionApres > emotionAvant) {
    return "Revenir sur cette pensée a pu raviver l'émotion, c'est normal. Prends soin de toi : l'exercice de respiration est accessible depuis le bouton SOS.";
  }
  return "L'émotion met parfois du temps à redescendre. Le travail que tu viens de faire compte quand même, et tu pourras relire cette session plus tard.";
}
