// I numeri degli "Esempi passo passo" (src/data/esempi.json) devono essere quelli che l'app calcola.
import { describe, it, expect } from 'vitest';
import { computeEquity } from '../src/engine/equity.ts';
import { parseCards } from '../src/engine/cards.ts';
import { buildTables, topPercentRange } from '../src/engine/preflopEquity.ts';
import { solvePushFold } from '../src/engine/pushfold.ts';
import { handIndex } from '../src/engine/ranges.ts';
import { countOuts } from '../src/engine/outs.ts';
import { icm, prizePool, prizesFromPool } from '../src/engine/icm.ts';
import { requiredEquityFromPot, callEV, spr } from '../src/engine/odds.ts';
import { baseOpenRange } from '../src/engine/openRanges.ts';
import { seatsFor, nextHandSeat } from '../src/engine/positions.ts';
import { generateStructure } from '../src/engine/structure.ts';
import eq from '../src/data/preflop-equity.json';
import esempi from '../src/data/esempi.json';

const t = buildTables(eq.data);
const H = parseCards;
const seat = (n: number, name: string) => seatsFor(n).find((s) => s.name === name)!;
const near = (x: number, target: number, tol: number) => expect(Math.abs(x - target)).toBeLessThan(tol);

describe('esempi passo passo', () => {
  it('il file ha esempi completi', () => {
    for (const s of esempi.sezioni) for (const e of s.esempi) {
      expect(e.passi.length).toBeGreaterThan(0);
      expect(e.risultato.length).toBeGreaterThan(10);
    }
  });
  it('struttura: 6×10.000 in 3 h', () => {
    const a = generateStructure({ entrants: 6, startingStack: 10000, hours: 3, levelMin: 0, ante: 'none' });
    expect([a.planned, a.levelMin, a.levels[0].bb, a.endBB, a.totalChips]).toEqual([12, 15, 100, 4000, 60000]);
  });
  it('preflop: A7o dal CO = raise; 44 dall\'HJ raise a 40+ e fold a 20–40', () => {
    expect(baseOpenRange('prudente', 'deep', seat(8, 'CO'))![handIndex('A7o')]).toBe(1);
    expect(baseOpenRange('prudente', 'deep', seat(8, 'HJ'))![handIndex('44')]).toBe(1);
    expect(baseOpenRange('prudente', 'medio', seat(8, 'HJ'))![handIndex('44')]).toBe(0);
  });
  it('mano dopo: dal bottone si passa a CO', () => {
    expect(nextHandSeat(seatsFor(8), 'b2')).toBe('b3');
    expect(nextHandSeat(seatsFor(8), 'b1')).toBe('b2');   // SB → BTN
    expect(nextHandSeat(seatsFor(8), 'bb')).toBe('b1');   // BB → SB
    expect(nextHandSeat(seatsFor(8), 'b7')).toBe('bb');   // UTG → BB
    expect(nextHandSeat(seatsFor(2), 'hu-sb')).toBe('hu-bb');
  });
  it('casuale: KsQs contro 3 casuali ≈ 38%', () => {
    const r = computeEquity(H('KsQs'), [{ kind: 'random' }, { kind: 'random' }, { kind: 'random' }], [], { timeBudgetMs: 3000, maxSamples: 400000 });
    near(r.equity[0], 0.382, 0.01);
  });
  it('range: AhQh su Kh7h2c contro top 20% = 64% esatto; call +4,7 BB', () => {
    const r = computeEquity(H('AhQh'), [{ kind: 'range', range: topPercentRange(t, 20) }], H('Kh7h2c'));
    expect(r.method).toBe('esatto');
    expect(r.samples).toBe(196020);
    near(r.equity[0], 0.640, 0.005);
    expect(requiredEquityFromPot(9, 3)).toBeCloseTo(0.25, 10);
    near(callEV(r.equity[0], 9, 3), 4.7, 0.05);
  });
  it('mano: 99 vs AKo 55,7% preflop e 8,8% su K72', () => {
    const a = computeEquity(H('9s9c'), [{ kind: 'hand', cards: H('AhKd') }], []);
    near(a.equity[0], 0.557, 0.001);
    const b = computeEquity(H('9s9c'), [{ kind: 'hand', cards: H('AhKd') }], H('Kc7d2s'));
    near(b.equity[0], 0.088, 0.001);
  });
  it('outs contro mano nota: 33,8% al flop, 22,7% e 10 carte al turn', () => {
    near(computeEquity(H('AhKh'), [{ kind: 'hand', cards: H('2s2d') }], H('QhJh2c')).equity[0], 0.338, 0.001);
    const o = countOuts(H('AhKh'), H('QhJh2c3d'), H('2s2d'))!;
    expect(o.vsHand!.outs.length).toBe(10);
  });
  it('più avversari: JJ 67% contro uno, 50% contro due (top 30%)', () => {
    const r30 = topPercentRange(t, 30);
    const one = computeEquity(H('JsJd'), [{ kind: 'range', range: r30 }], [], { timeBudgetMs: 3000, maxSamples: 300000 });
    const two = computeEquity(H('JsJd'), [{ kind: 'range', range: r30 }, { kind: 'range', range: r30 }], [], { timeBudgetMs: 3000, maxSamples: 300000 });
    near(one.equity[0], 0.671, 0.01);
    near(two.equity[0], 0.504, 0.01);
  });
  it('outs progetto: 14 puliti + 1 sporco, 29,8% / 51,2%', () => {
    const o = countOuts(H('9h8h'), H('7h6c2h'))!;
    expect([o.clean, o.strong]).toEqual([14, 15]);
    near(o.pNext, 0.298, 0.001);
    near(o.pBoth!, 0.512, 0.001);
  });
  it('push/fold senza ante a 8: K9o shove dal BTN a 8 BB, Q9o no; BB chiama A5o a 10 BB, non K9o', () => {
    const p8 = solvePushFold(t, { players: 8, behind: 2, stackBB: 8, antePerPlayer: 0, bbAnte: 0 });
    expect(p8.push[handIndex('K9o')]).toBe(1);
    expect(p8.push[handIndex('Q9o')]).toBe(0);
    near(p8.pushPct, 33, 1);
    const p10 = solvePushFold(t, { players: 8, behind: 2, stackBB: 10, antePerPlayer: 0, bbAnte: 0 });
    const bb = p10.calls[p10.calls.length - 1].range;
    expect(bb[handIndex('A5o')]).toBe(1);
    expect(bb[handIndex('K9o')]).toBe(0);
  });
  it('ICM con rebuy: 6×10 + 4×10 = 100 → 60/30/10; 30k/20k/10k → 42,00 / 34,67 / 23,33', () => {
    const pool = prizePool(6, 10, 4, 10);
    expect(pool).toBe(100);
    expect(prizesFromPool(pool, [60, 30, 10])).toEqual([60, 30, 10]);
    expect(prizesFromPool(70, [65, 35])).toEqual([45, 25]);   // euro interi, il resto al 1°
    expect(prizesFromPool(80, [100])).toEqual([80]);
    const v = icm([30000, 20000, 10000], [60, 30, 10]);
    expect(v.map((x) => +x.toFixed(2))).toEqual([42, 34.67, 23.33]);
  });
  it('size e SPR: 3,5 BB = 700; 3-bet 1.500 / 2.000; SPR 2,5', () => {
    expect((2.5 + 1) * 200).toBe(700);
    expect(2.5 * 3 * 200).toBe(1500);
    expect(2.5 * 4 * 200).toBe(2000);
    expect(spr(3000, 1200)).toBe(2.5);
  });
});
