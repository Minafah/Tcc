import { describe, expect, it } from 'vitest';
import { DISTORSIONS, PROBLEMATIQUES, VERIFICATION, distorsionsDe } from './contenu';

describe('fiches « Comprendre ce piège »', () => {
  it('chaque piège proposé a une fiche complète (quoi, cerveau, corps, esprit, astuce)', () => {
    const proposes = new Set(PROBLEMATIQUES.filter((p) => p.active).flatMap((p) => distorsionsDe(p.id).map((d) => d.id)));
    for (const d of DISTORSIONS.filter((x) => proposes.has(x.id))) {
      const e = d.explication;
      expect(e, d.id).toBeDefined();
      for (const champ of [e!.quoi, e!.cerveau, e!.corps, e!.esprit, e!.astuce]) expect(champ.trim().length, d.id).toBeGreaterThan(20);
    }
  });
});

describe('questions de vérification', () => {
  it('ne contiennent plus la phrase « y croire à 100 % » ni de doublon du curseur 0-100', () => {
    for (const liste of Object.values(VERIFICATION)) {
      for (const q of liste) {
        expect(q).not.toMatch(/100 %/);
      }
    }
  });
});
