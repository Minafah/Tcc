import { describe, expect, it } from 'vitest';
import { detecterCrise } from './crise';
import { contientMotCle, normaliser } from './texte';

describe('normaliser', () => {
  it('retire accents, majuscules et ponctuation', () => {
    expect(normaliser("J'ai PEUR, c'est sûr !")).toBe('j ai peur c est sur');
  });
});

describe('contientMotCle', () => {
  it('respecte les mots entiers', () => {
    expect(contientMotCle('je vais en finir', 'en finir')).toBe(true);
    expect(contientMotCle('je vais en finiraaa', 'en finir')).toBe(false);
  });
  it('gère les préfixes avec *', () => {
    expect(contientMotCle('idees suicidaires', 'suicid*')).toBe(true);
    expect(contientMotCle('asuicide', 'suicid*')).toBe(false);
  });
});

describe('detecterCrise', () => {
  it('détecte les expressions de crise, avec variantes et accents', () => {
    expect(detecterCrise(["J'ai envie d'en finir"])).toContain('en finir');
    expect(detecterCrise(['Je pense au SUICIDE'])).toContain('suicid*');
    expect(detecterCrise(['je veux me scarifier'])).not.toHaveLength(0);
    expect(detecterCrise(['Tout le monde serait mieux sans moi'])).toContain('mieux sans moi');
    expect(detecterCrise(['je pense au sucide'])).not.toHaveLength(0);
    expect(detecterCrise(['Je ne veux plus être là'])).not.toHaveLength(0);
  });

  it('cherche dans tous les champs', () => {
    expect(detecterCrise(['situation banale', "j'ai envie de mourir"])).toContain('envie de mourir');
  });

  it("ne réagit pas à des pensées anxieuses courantes", () => {
    expect(detecterCrise(["J'ai peur de rater mon examen, ce sera terrible"])).toEqual([]);
    expect(detecterCrise(['Il pense que je suis nul'])).toEqual([]);
    expect(detecterCrise([''])).toEqual([]);
  });
});
