import { describe, expect, it } from 'vitest';
import { DISTORSIONS_PRIORITAIRES, EMOTIONS_VERS_PROBLEMATIQUE, QUESTIONS, distorsionsDe, question } from './contenu';
import { selectionnerQuestions, suggererDistorsion } from './moteur';

describe('banque culpabilité', () => {
  const possibles = distorsionsDe('culpabilite').map((d) => d.id);

  it('propose les 6 distorsions de la culpabilité (sections 11.2 à 11.7)', () => {
    expect([...possibles].sort()).toEqual(
      [
        'devalorisation_globale',
        'double_standard',
        'imperatifs',
        'jugement_retrospectif',
        'personnalisation',
        'rumination_culpabilite',
      ].sort(),
    );
  });

  it('ne pioche que des questions de culpabilité, avec départ, preuves et clôture', () => {
    for (const d of possibles) {
      for (let seed = 1; seed < 20; seed++) {
        let x = seed;
        const { questionIds } = selectionnerQuestions({
          questions: QUESTIONS,
          problematique: 'culpabilite',
          distorsion: d,
          distorsionsPossibles: possibles,
          historique: [],
          aleatoire: () => ((x = (x * 1103515245 + 12345) % 2 ** 31), x / 2 ** 31),
        });
        const qs = questionIds.map((id) => question(id)!);
        expect(qs.every((q) => q.problematique === 'culpabilite')).toBe(true);
        expect(qs[0].categorie).toBe('depart');
        expect(qs[qs.length - 1].categorie).toBe('cloture');
        expect(qs.length).toBeGreaterThanOrEqual(4);
        expect(qs.some((q) => q.preuves)).toBe(true);
      }
    }
  });

  it('suggère une distorsion de culpabilité à partir de la pensée', () => {
    const distorsions = distorsionsDe('culpabilite');
    expect(suggererDistorsion("C'est entièrement de ma faute", distorsions)).toBe('personnalisation');
    expect(suggererDistorsion("Si j'avais su, j'aurais dû le voir venir", distorsions)).toBe('jugement_retrospectif');
    expect(suggererDistorsion('Je ne vaux rien', distorsions)).toBe('devalorisation_globale');
    expect(suggererDistorsion("Je m'en veux, ça me ronge", distorsions)).toBe('rumination_culpabilite');
  });

  it('relie culpabilité et honte à la problématique, et oriente la honte vers 11.5 et 11.7', () => {
    expect(EMOTIONS_VERS_PROBLEMATIQUE['Culpabilité']).toBe('culpabilite');
    expect(EMOTIONS_VERS_PROBLEMATIQUE['Honte']).toBe('culpabilite');
    expect(DISTORSIONS_PRIORITAIRES['Honte']).toEqual(['devalorisation_globale', 'double_standard']);
  });
});
