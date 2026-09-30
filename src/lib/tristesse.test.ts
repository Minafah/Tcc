import { describe, expect, it } from 'vitest';
import { EMOTIONS_VERS_PROBLEMATIQUE, QUESTIONS, distorsionsDe, question } from './contenu';
import { detecterCrise } from './crise';
import { selectionnerQuestions, suggererDistorsion } from './moteur';

describe('banque tristesse', () => {
  const possibles = distorsionsDe('tristesse').map((d) => d.id);

  it('propose les distorsions des sections 12.2 à 12.7', () => {
    for (const id of [
      'filtre_mental',
      'disqualification_positif',
      'surgeneralisation',
      'vision_negative_avenir',
      'devalorisation_globale',
      'comparaison_rumination',
    ]) {
      expect(possibles).toContain(id);
    }
  });

  it('ne pioche que des questions de tristesse, avec départ, preuves et clôture', () => {
    for (const d of possibles) {
      for (let seed = 1; seed < 20; seed++) {
        let x = seed;
        const { questionIds } = selectionnerQuestions({
          questions: QUESTIONS,
          problematique: 'tristesse',
          distorsion: d,
          distorsionsPossibles: possibles,
          historique: [],
          aleatoire: () => ((x = (x * 1103515245 + 12345) % 2 ** 31), x / 2 ** 31),
        });
        const qs = questionIds.map((id) => question(id)!);
        expect(qs.every((q) => q.problematique === 'tristesse')).toBe(true);
        expect(qs[0].categorie).toBe('depart');
        expect(qs[qs.length - 1].categorie).toBe('cloture');
        expect(qs.length).toBeGreaterThanOrEqual(4);
        expect(qs.some((q) => q.preuves)).toBe(true);
      }
    }
  });

  it('suggère une distorsion de tristesse à partir de la pensée', () => {
    const distorsions = distorsionsDe('tristesse');
    expect(suggererDistorsion('Tout va mal, rien ne va', distorsions)).toBe('filtre_mental');
    expect(suggererDistorsion("J'ai réussi mais c'était de la chance, ça ne compte pas", distorsions)).toBe('disqualification_positif');
    expect(suggererDistorsion("Ça ne s'arrangera jamais, aucun espoir", distorsions)).toBe('vision_negative_avenir');
  });

  it('relie tristesse et découragement à la problématique', () => {
    expect(EMOTIONS_VERS_PROBLEMATIQUE['Tristesse']).toBe('tristesse');
    expect(EMOTIONS_VERS_PROBLEMATIQUE['Découragement']).toBe('tristesse');
  });

  it('déclenche le filet de sécurité sur les idées noires (règle 12.9)', () => {
    expect(detecterCrise(["J'ai des idées noires depuis ce matin"])).toContain('idees noires');
    expect(detecterCrise(['Je ne vois aucune issue'])).toContain('aucune issue');
    expect(detecterCrise(['Je suis triste, ma journée était pourrie'])).toEqual([]);
  });
});

describe('suggestion : les expressions précises priment sur les mots isolés', () => {
  it('« ça ne s’arrangera jamais » → vision négative de l’avenir, pas tout ou rien', () => {
    expect(suggererDistorsion("Tout va mal et ça ne s'arrangera jamais", distorsionsDe('tristesse'))).toBe('vision_negative_avenir');
  });
});
