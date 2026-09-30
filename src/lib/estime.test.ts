import { describe, expect, it } from 'vitest';
import { BANQUES_ASSOCIEES, EMOTIONS_VERS_PROBLEMATIQUE, QUESTIONS, distorsionsDe, question } from './contenu';
import { selectionnerQuestions, suggererDistorsion } from './moteur';

const graine = (n: number) => {
  let x = n;
  return () => ((x = (x * 1103515245 + 12345) % 2 ** 31), x / 2 ** 31);
};

describe('banque estime de soi', () => {
  const possibles = distorsionsDe('estime').map((d) => d.id);
  const associees = BANQUES_ASSOCIEES['estime'];

  it('propose les distorsions des sections 13.2 à 13.7', () => {
    expect([...possibles].sort()).toEqual(
      ['comparaison_rumination', 'estime_conditionnelle', 'etiquetage_global', 'filtre_mental', 'lecture_pensee', 'perfectionnisme'].sort(),
    );
  });

  it('départ et clôture viennent de la banque estime, le milieu peut venir des banques associées (13.9)', () => {
    const autorisees = new Set(['estime', ...associees]);
    let empruntees = 0;
    for (const d of possibles) {
      for (let seed = 1; seed < 20; seed++) {
        const { questionIds } = selectionnerQuestions({
          questions: QUESTIONS,
          problematique: 'estime',
          distorsion: d,
          distorsionsPossibles: possibles,
          historique: [],
          problematiquesAssociees: associees,
          aleatoire: graine(seed),
        });
        const qs = questionIds.map((id) => question(id)!);
        expect(qs[0].categorie).toBe('depart');
        expect(qs[0].problematique).toBe('estime');
        expect(qs[qs.length - 1].categorie).toBe('cloture');
        expect(qs[qs.length - 1].problematique).toBe('estime');
        expect(qs.length).toBeGreaterThanOrEqual(4);
        expect(qs.some((q) => q.preuves)).toBe(true);
        for (const q of qs) expect(autorisees.has(q.problematique)).toBe(true);
        empruntees += qs.filter((q) => q.problematique !== 'estime').length;
      }
    }
    // « Filtre mental » et « Comparaison » existent aussi en tristesse : certaines questions sont empruntées.
    expect(empruntees).toBeGreaterThan(0);
  });

  it('sans banque associée, ne pioche que dans l’estime de soi', () => {
    const { questionIds } = selectionnerQuestions({
      questions: QUESTIONS,
      problematique: 'estime',
      distorsion: 'filtre_mental',
      distorsionsPossibles: possibles,
      historique: [],
      aleatoire: graine(3),
    });
    expect(questionIds.every((id) => question(id)!.problematique === 'estime')).toBe(true);
  });

  it('suggère une distorsion d’estime de soi à partir de la pensée', () => {
    const distorsions = distorsionsDe('estime');
    expect(suggererDistorsion("J'ai raté mon exposé, je suis nul", distorsions)).toBe('etiquetage_global');
    expect(suggererDistorsion("Ce n'était pas parfait, pas à la hauteur", distorsions)).toBe('perfectionnisme');
    expect(suggererDistorsion('Si je rate cet entretien, je ne vaux rien si je ne réussis pas', distorsions)).toBe('estime_conditionnelle');
  });

  it('relie « Doute de soi » à l’estime de soi', () => {
    expect(EMOTIONS_VERS_PROBLEMATIQUE['Doute de soi']).toBe('estime');
  });
});
