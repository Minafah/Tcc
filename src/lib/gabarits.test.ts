import { describe, expect, it } from 'vitest';
import { GABARITS, PROBLEMATIQUES } from './contenu';
import { CLE_PIEGE, casesARemplir, composer, estComplet, morceaux } from './gabarits';

describe('chemins guidés (gabarits)', () => {
  it('chaque problématique active propose des chemins, et chaque case a sa question', () => {
    for (const p of PROBLEMATIQUES.filter((x) => x.active)) {
      const liste = GABARITS[p.id];
      expect(liste.length).toBeGreaterThan(0);
      for (const g of liste) {
        expect(g.titre).not.toBe('');
        expect(g.emoji).not.toBe('');
        const cases = casesARemplir(g);
        expect(cases.length).toBeGreaterThan(0);
        for (const cle of cases) {
          expect(g.champs[cle]?.question).toBeTruthy();
          expect(g.champs[cle]?.exemple).toBeTruthy();
        }
      }
    }
  });

  it('découpe la phrase en texte et cases', () => {
    expect(morceaux('A [x] B [piege].')).toEqual([{ texte: 'A ' }, { cle: 'x' }, { texte: ' B ' }, { cle: CLE_PIEGE }, { texte: '.' }]);
  });

  it('compose la phrase avec les réponses et le piège choisi, sans crochets', () => {
    const [scenario, , piege] = GABARITS['anxiete'];
    expect(composer(scenario, {}, 'Catastrophisme')).toBe(
      'Il est possible que …, mais il est plus probable que …, et si le pire arrivait, je pourrais ….',
    );
    const valeurs = { redoute: 'ça se passe mal', probable: "on fasse le point", ressource: 'demander de l’aide' };
    expect(estComplet(scenario, valeurs)).toBe(true);
    expect(composer(scenario, valeurs)).not.toMatch(/[[\]]/);
    expect(composer(piege, { reformulation: 'ce n’est pas un verdict' }, 'Catastrophisme')).toBe(
      'Dans cette pensée, je reconnais le piège « Catastrophisme » ; en tenant compte des faits, une version plus juste serait : ce n’est pas un verdict.',
    );
  });

  it('une case vide ou faite d’espaces n’est pas remplie', () => {
    const [, incertitude] = GABARITS['anxiete'];
    expect(estComplet(incertitude, { incertain: 'la suite', action: '   ' })).toBe(false);
  });
});

describe('élision', () => {
  const g = { titre: 't', emoji: 'e', phrase: 'Il est probable que [a], et je parle de [b] avec [c].', champs: {} };
  it('élide que, de devant une voyelle, pas devant une consonne ou un h', () => {
    expect(composer(g, { a: 'on fasse le point', b: 'Hugo', c: 'elle' })).toBe(
      "Il est probable qu'on fasse le point, et je parle de Hugo avec elle.",
    );
    expect(composer(g, { a: 'il pleuve', b: 'Anna', c: 'lui' })).toBe("Il est probable qu'il pleuve, et je parle d'Anna avec lui.");
    expect(composer(g, { a: 'ça aille', b: 'mon frère', c: 'lui' })).toBe('Il est probable que ça aille, et je parle de mon frère avec lui.');
  });
});
