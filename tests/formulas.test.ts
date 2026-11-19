// Test delle formule verificate nella Fase 1 (VALIDAZIONE.md).
import { describe, it, expect } from 'vitest';
import { requiredEquity, requiredEquityFromPot, bluffFoldNeeded, callEV, hitOneCard, hitTwoCards, ruleOf4, effectiveBB, mRatio, spr } from '../src/engine/odds.ts';
import { icm, icmHeadsUp } from '../src/engine/icm.ts';
import { parseRange, rangeCombos, rangePercent, rangeToString, combosOf, handName } from '../src/engine/ranges.ts';
import { seatsFor } from '../src/engine/positions.ts';
import rangesData from '../src/data/ranges.json';

describe('pot odds e bluff', () => {
  const table: [number, number, number][] = [
    [1 / 4, 16.67, 20.0], [1 / 3, 20.0, 25.0], [1 / 2, 25.0, 33.33], [2 / 3, 28.57, 40.0], [3 / 4, 30.0, 42.86], [1, 33.33, 50.0], [1.5, 37.5, 60.0],
  ];
  for (const [x, eq, fold] of table) {
    it(`puntata ${x.toFixed(2)} × piatto`, () => {
      expect(requiredEquity(1, x) * 100).toBeCloseTo(eq, 1);
      expect(bluffFoldNeeded(1, x) * 100).toBeCloseTo(fold, 1);
    });
  }
  it('variante con piatto già comprensivo della puntata è equivalente', () => {
    expect(requiredEquityFromPot(150, 50)).toBeCloseTo(requiredEquity(100, 50), 12);
  });
  it('EV del call: esempio del foglio (P=100, B=50, equity 30%) = +10', () => {
    expect(callEV(0.3, 150, 50)).toBeCloseTo(10, 10);
    expect(callEV(0.25, 150, 50)).toBeCloseTo(0, 10);
  });
});

describe('outs', () => {
  const rows: [number, number, number, number][] = [
    [4, 8.51, 8.7, 16.47], [8, 17.02, 17.39, 31.45], [9, 19.15, 19.57, 34.97], [12, 25.53, 26.09, 44.96], [15, 31.91, 32.61, 54.12],
  ];
  for (const [o, t, r, both] of rows) {
    it(`${o} outs`, () => {
      expect(hitOneCard(o, 47) * 100).toBeCloseTo(t, 1);
      expect(hitOneCard(o, 46) * 100).toBeCloseTo(r, 1);
      expect(hitTwoCards(o) * 100).toBeCloseTo(both, 1);
    });
  }
  it('regola ×4 corretta resta entro 1,5 punti', () => {
    for (let o = 1; o <= 20; o++) expect(Math.abs(ruleOf4(o) - hitTwoCards(o) * 100)).toBeLessThan(1.6);
  });
  it('progetto colore a mezzo piatto: prezzo 25%, turn 19,1%, river 35,0%', () => {
    expect(requiredEquity(1, 0.5)).toBeCloseTo(0.25, 10);
    expect(hitOneCard(9, 47) * 100).toBeCloseTo(19.1, 1);
    expect(hitTwoCards(9) * 100).toBeCloseTo(35.0, 1);
  });
});

describe('stack, M, SPR', () => {
  it('stack effettivo del foglio: 12 BB', () => expect(effectiveBB(1200, 1800, 100)).toBe(12));
  it('M', () => expect(mRatio(3000, 50, 100, 0)).toBe(20));
  it('SPR', () => expect(spr(900, 300)).toBe(3));
});

describe('ICM', () => {
  it('a due giocatori coincide con la formula del foglio: 44 / 56', () => {
    expect(icmHeadsUp(1200, 1800, 80, 20)).toBeCloseTo(44, 10);
    const v = icm([1200, 1800], [80, 20]);
    expect(v[0]).toBeCloseTo(44, 10);
    expect(v[1]).toBeCloseTo(56, 10);
  });
  it('winner-take-all = quota di chip', () => {
    const v = icm([5000, 3000, 2000], [100]);
    expect(v.map((x) => +x.toFixed(10))).toEqual([50, 30, 20]);
  });
  it('3 giocatori: confronto con permutazioni esplicite', () => {
    const st = [5000, 3000, 2000], pr = [50, 30, 20];
    const v = icm(st, pr);
    expect(v[0]).toBeCloseTo(38.393, 3);
    expect(v[1]).toBeCloseTo(32.75, 3);
    expect(v[2]).toBeCloseTo(28.857, 3);
    expect(v.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 9);
  });
  it('10 giocatori: la somma è il montepremi e chi ha più chip vale di più', () => {
    const st = [12000, 9000, 8000, 7000, 6000, 5000, 4000, 3000, 2000, 1000];
    const v = icm(st, [40, 25, 15, 10, 6, 4]);
    expect(v.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 8);
    for (let i = 1; i < v.length; i++) expect(v[i]).toBeLessThan(v[i - 1]);
  });
});

describe('range e combinazioni', () => {
  it('pesi: 169 mani = 1326 combinazioni', () => {
    let n = 0;
    for (let i = 0; i < 169; i++) n += combosOf(i).length;
    expect(n).toBe(1326);
  });
  it('liste del foglio: combinazioni e percentuali dichiarate', () => {
    const exp: Record<string, [number, number]> = { b7: [124, 9.4], b6: [154, 11.6], b5: [196, 14.8], b4: [266, 20.1], b3: [358, 27.0], b2: [538, 40.6], b1: [402, 30.3] };
    for (const [k, [c, p]] of Object.entries(exp)) {
      const r = parseRange((rangesData.profili.prudente.range as Record<string, string>)[k]);
      expect(rangeCombos(r)).toBe(c);
      expect(rangePercent(r)).toBeCloseTo(p, 1);
    }
  });
  it('notazione: K9s+ = K9s, KTs, KJs, KQs; ida e ritorno', () => {
    const r = parseRange('K9s+');
    const names = Array.from(r).map((v, i) => (v ? handName(i) : '')).filter(Boolean).sort();
    expect(names).toEqual(['K9s', 'KJs', 'KQs', 'KTs']);
    for (const s of Object.values(rangesData.profili.standard.range)) {
      const a = parseRange(s);
      expect(Array.from(parseRange(rangeToString(a)))).toEqual(Array.from(a));
    }
  });
  it('ogni range contiene quello della posizione precedente', () => {
    for (const prof of Object.values(rangesData.profili)) {
      const R = prof.range as Record<string, string>;
      for (let b = 9; b > 2; b--) {
        const tight = parseRange(R['b' + b]), loose = parseRange(R['b' + (b - 1)]);
        for (let i = 0; i < 169; i++) if (tight[i]) expect(loose[i], `${prof.nome} b${b}→b${b - 1} ${handName(i)}`).toBe(1);
      }
    }
  });
});

describe('posizioni (correzioni della Fase 1)', () => {
  const keys = (n: number) => seatsFor(n).map((s) => s.key);
  const names = (n: number) => seatsFor(n).map((s) => s.name);
  it('8 giocatori = base del foglio', () => expect(keys(8)).toEqual(['b7', 'b6', 'b5', 'b4', 'b3', 'b2', 'b1', 'bb']));
  it('7 giocatori: si elimina UTG (il primo usa il range di UTG+1 a 8)', () => {
    expect(keys(7)[0]).toBe('b6');
    expect(names(7)).toEqual(['UTG', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']);
  });
  it('6 giocatori: elimina UTG e UTG+1', () => expect(keys(6)).toEqual(['b5', 'b4', 'b3', 'b2', 'b1', 'bb']));
  it('9 giocatori: il posto nuovo è il primo, più stretto', () => {
    expect(keys(9)[0]).toBe('b8');
    expect(names(9).slice(0, 4)).toEqual(['UTG', 'UTG+1', 'UTG+2', 'LJ']);
  });
  it('10 giocatori', () => expect(keys(10).slice(0, 3)).toEqual(['b9', 'b8', 'b7']));
  it('5, 4, 3, 2 giocatori', () => {
    expect(names(5)).toEqual(['HJ', 'CO', 'BTN', 'SB', 'BB']);
    expect(names(4)).toEqual(['CO', 'BTN', 'SB', 'BB']);
    expect(names(3)).toEqual(['BTN', 'SB', 'BB']);
    expect(keys(2)).toEqual(['hu-sb', 'hu-bb']);
  });
});
