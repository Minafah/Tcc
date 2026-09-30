import { describe, expect, it } from 'vitest';
import { evolution, messageBilan } from './bilan';
import { nouvelleSessionTest } from './testUtils';

describe('evolution', () => {
  it('décrit une baisse, une hausse ou une stabilité', () => {
    expect(evolution(70, 35)).toBe('de 70 à 35 (−35 points)');
    expect(evolution(40, 55, ' %')).toBe('de 40 % à 55 % (+15 points)');
    expect(evolution(50, 49)).toBe('de 50 à 49 (−1 point)');
    expect(evolution(50, 50, ' %')).toBe("50 %, sans changement pour l'instant");
  });
});

describe('messageBilan', () => {
  const session = (emotion: [number, number], croyance: [number, number]) => {
    const s = nouvelleSessionTest();
    s.emotion = { libelle: 'Anxiété', intensiteAvant: emotion[0], intensiteApres: emotion[1] };
    s.pensee = { ...s.pensee, croyanceAvant: croyance[0], croyanceApres: croyance[1] };
    return s;
  };

  it("adapte le message à ce qui a bougé", () => {
    expect(messageBilan(session([70, 40], [80, 50]))).toMatch(/a fait bouger/);
    expect(messageBilan(session([70, 70], [80, 50]))).toMatch(/tu crois moins/);
    expect(messageBilan(session([50, 60], [50, 50]))).toMatch(/raviver/);
    expect(messageBilan(session([50, 50], [50, 50]))).toMatch(/temps à redescendre/);
  });
});
