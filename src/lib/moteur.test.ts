import { describe, expect, it } from 'vitest';
import { DISTORSIONS, QUESTIONS, distorsionsDe, question } from './contenu';
import {
  distorsionMoinsRecente,
  questionsBloquees,
  selectionnerQuestions,
  suggererDistorsion,
  suggererProfessionnel,
} from './moteur';
import { nouvelleSessionTest } from './testUtils';
import type { Session } from './types';

const POSSIBLES = distorsionsDe('anxiete').map((d) => d.id);

/** Générateur pseudo-aléatoire reproductible. */
function graine(n: number) {
  let x = n;
  return () => {
    x = (x * 1103515245 + 12345) % 2 ** 31;
    return x / 2 ** 31;
  };
}

function selection(distorsion: string | null, historique: Session[] = [], seed = 1) {
  return selectionnerQuestions({
    questions: QUESTIONS,
    problematique: 'anxiete',
    distorsion,
    distorsionsPossibles: POSSIBLES,
    historique,
    aleatoire: graine(seed),
  });
}

describe('contenu clinique', () => {
  it('a des identifiants uniques et des distorsions connues', () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    const connues = new Set(DISTORSIONS.map((d) => d.id));
    for (const q of QUESTIONS) for (const d of q.distorsions) expect(connues.has(d)).toBe(true);
  });

  it('propose les 8 distorsions de la banque anxiété', () => {
    expect(POSSIBLES).toHaveLength(8);
  });
});

describe('selectionnerQuestions', () => {
  it('sélectionne 1 départ, 2 à 3 questions de la distorsion, puis 1 clôture', () => {
    for (const d of POSSIBLES) {
      for (let seed = 1; seed < 20; seed++) {
        const { questionIds, distorsion } = selection(d, [], seed);
        expect(distorsion).toBe(d);
        expect(questionIds.length).toBeGreaterThanOrEqual(4);
        expect(questionIds.length).toBeLessThanOrEqual(5);
        const qs = questionIds.map((id) => question(id)!);
        expect(qs[0].categorie).toBe('depart');
        expect(qs[qs.length - 1].categorie).toBe('cloture');
        const milieu = qs.slice(1, -1);
        expect(milieu.every((q) => q.categorie === 'distorsion')).toBe(true);
        expect(new Set(questionIds).size).toBe(questionIds.length);
      }
    }
  });

  it('inclut au moins une question sur les preuves', () => {
    for (const d of POSSIBLES) {
      for (let seed = 1; seed < 20; seed++) {
        const qs = selection(d, [], seed).questionIds.map((id) => question(id)!);
        expect(qs.some((q) => q.preuves)).toBe(true);
      }
    }
  });

  it("choisit une distorsion jamais utilisée quand je ne sais pas laquelle choisir", () => {
    const historique = POSSIBLES.slice(0, 7).map((d) => sessionTerminee(d, []));
    expect(selection(null, historique).distorsion).toBe(POSSIBLES[7]);
  });

  it('évite les questions posées dans les 3 dernières sessions de la même distorsion', () => {
    // Catastrophisme : 5 questions propres + 2 partagées. On en « pose » 3.
    const posees = ['anx-cat1', 'anx-cat2', 'anx-cat5'];
    const historique = [sessionTerminee('catastrophisme', posees)];
    for (let seed = 1; seed < 30; seed++) {
      const ids = selection('catastrophisme', historique, seed).questionIds;
      for (const id of posees) expect(ids).not.toContain(id);
    }
  });

  it("retire une question « pas utile » de la rotation pendant 10 sessions", () => {
    const pasUtile = sessionTerminee('tout_ou_rien', ['anx-tor1'], { 'anx-tor1': false });
    const autres = Array.from({ length: 9 }, () => sessionTerminee('imperatifs', []));
    const historique = [...autres, pasUtile]; // la plus récente en premier
    expect(questionsBloquees(historique).has('anx-tor1')).toBe(true);
    for (let seed = 1; seed < 30; seed++) {
      expect(selection('tout_ou_rien', historique, seed).questionIds).not.toContain('anx-tor1');
    }
    // Après 10 autres sessions, elle peut revenir.
    const plusTard = [sessionTerminee('imperatifs', []), ...historique];
    expect(questionsBloquees(plusTard).has('anx-tor1')).toBe(false);
  });

  it("ne compte pas une question passée comme « pas utile »", () => {
    const s = sessionTerminee('tout_ou_rien', ['anx-tor1']);
    s.reponses[0].passee = true;
    expect(questionsBloquees([s]).has('anx-tor1')).toBe(false);
  });

  it('complète avec d’autres distorsions si la banque est épuisée', () => {
    // Toutes les questions « tout ou rien » marquées pas utiles.
    const ids = QUESTIONS.filter((q) => q.distorsions.includes('tout_ou_rien')).map((q) => q.id);
    const utile = Object.fromEntries(ids.map((id) => [id, false]));
    const historique = [sessionTerminee('tout_ou_rien', ids, utile)];
    const qs = selection('tout_ou_rien', historique).questionIds;
    expect(qs.length).toBeGreaterThanOrEqual(4);
    for (const id of ids) expect(qs).not.toContain(id);
  });
});

describe('distorsionMoinsRecente', () => {
  it('prend la distorsion utilisée il y a le plus longtemps', () => {
    const historique = [sessionTerminee('a', []), sessionTerminee('b', []), sessionTerminee('c', [])];
    expect(distorsionMoinsRecente(['a', 'b', 'c'], historique)).toBe('c');
  });
});

describe('suggererDistorsion', () => {
  const cas: [string, string][] = [
    ["Ce sera terrible, une vraie catastrophe", 'catastrophisme'],
    ['Il pense que je suis nul', 'lecture_pensee'],
    ['Je dois absolument tout réussir, il faut que ce soit parfait', 'imperatifs'],
    ["Je n'y arriverai pas, je ne pourrai pas gérer", 'ressources'],
    ['Et si je tombais malade ? Je ne sais pas ce qui va se passer', 'incertitude'],
  ];
  it.each(cas)('« %s » → %s', (texte, attendu) => {
    expect(suggererDistorsion(texte, DISTORSIONS)).toBe(attendu);
  });

  it('ne suggère rien sans indice', () => {
    expect(suggererDistorsion('Je suis fatigué ce soir', DISTORSIONS)).toBeNull();
  });
});

describe('suggererProfessionnel', () => {
  it("s'active après 3 sessions consécutives à intensité très élevée", () => {
    const haute = () => ({ ...sessionTerminee('a', []), emotion: { libelle: 'Anxiété', intensiteAvant: 90, intensiteApres: 80 } });
    const basse = { ...sessionTerminee('a', []), emotion: { libelle: 'Anxiété', intensiteAvant: 90, intensiteApres: 30 } };
    expect(suggererProfessionnel([haute(), haute(), haute()])).toBe(true);
    expect(suggererProfessionnel([haute(), basse, haute()])).toBe(false);
    expect(suggererProfessionnel([haute(), haute()])).toBe(false);
  });
});

function sessionTerminee(distorsion: string, questionIds: string[], utile: Record<string, boolean> = {}): Session {
  return {
    ...nouvelleSessionTest(),
    statut: 'terminee',
    pensee: { texte: 'x', croyanceAvant: 50, croyanceApres: 40, distorsions: [distorsion] },
    questionIds,
    reponses: questionIds.map((id) => ({ questionId: id, texte: 'r', utile: utile[id] ?? null, passee: false })),
  };
}
