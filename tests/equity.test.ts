import { describe, it, expect } from 'vitest';
import { computeEquity } from '../src/engine/equity.ts';
import { parseCards } from '../src/engine/cards.ts';
import { parseRange } from '../src/engine/ranges.ts';
import { countOuts } from '../src/engine/outs.ts';

const H = parseCards;

describe('equity', () => {
  it('AA vs KK preflop (esatto) ≈ 82% / 18%', () => {
    const r = computeEquity(H('AhAs'), [{ kind: 'hand', cards: H('KdKc') }], []);
    expect(r.method).toBe('esatto');
    expect(r.samples).toBe(1712304);
    expect(r.equity[0]).toBeGreaterThan(0.81);
    expect(r.equity[0]).toBeLessThan(0.83);
    expect(r.equity[0] + r.equity[1]).toBeCloseTo(1, 9);
  });

  it('coin flip: 22 vs AKo ≈ 52–53%', () => {
    const r = computeEquity(H('2c2d'), [{ kind: 'hand', cards: H('AhKs') }], []);
    expect(r.equity[0]).toBeGreaterThan(0.51);
    expect(r.equity[0]).toBeLessThan(0.54);
  });

  it('AKs vs QQ ≈ 46%', () => {
    const r = computeEquity(H('AhKh'), [{ kind: 'hand', cards: H('QsQd') }], []);
    expect(r.equity[0]).toBeGreaterThan(0.44);
    expect(r.equity[0]).toBeLessThan(0.48);
  });

  it('turn esatto: 10 river vincenti su 44 → 22,73%', () => {
    // AhKh su Qh Jh 2c 3d contro set di 2: vincono 4h–9h, Th (7) e Tc Td Ts (3). 2h e 3h danno poker/full all'avversario.
    const r = computeEquity(H('AhKh'), [{ kind: 'hand', cards: H('2s2d') }], H('QhJh2c3d'));
    expect(r.method).toBe('esatto');
    expect(r.samples).toBe(44);
    expect(r.equity[0]).toBeCloseTo(10 / 44, 10);
  });

  it('pareggio a board fisso: equity 50/50', () => {
    const r = computeEquity(H('2c3d'), [{ kind: 'hand', cards: H('4s5h') }], H('AhKhQhJhTh'));
    expect(r.equity[0]).toBeCloseTo(0.5, 10);
    expect(r.tie[0]).toBeCloseTo(1, 10);
  });

  it('Monte Carlo multiway: AA contro 2 mani casuali ≈ 73,5%', () => {
    const r = computeEquity(H('AsAd'), [{ kind: 'random' }, { kind: 'random' }], [], { timeBudgetMs: 4000, maxSamples: 300000 });
    expect(r.method).toBe('montecarlo');
    expect(Math.abs(r.equity[0] - 0.735)).toBeLessThan(0.015);
    const s = r.equity.reduce((a, b) => a + b, 0);
    expect(s).toBeCloseTo(1, 6);
  });

  it('contro un range: AhAd vs KK ≈ 82%; vs range esatto al flop', () => {
    const r = computeEquity(H('AhAd'), [{ kind: 'range', range: parseRange('KK') }], [], { timeBudgetMs: 3000, maxSamples: 200000 });
    expect(r.equity[0]).toBeGreaterThan(0.8);
    expect(r.equity[0]).toBeLessThan(0.84);
    const f = computeEquity(H('AhAd'), [{ kind: 'range', range: parseRange('KK, QQ, AKs') }], H('2c7d9s'));
    expect(f.method).toBe('esatto');
    expect(f.equity[0]).toBeGreaterThan(0.85);
  });

  it('errori: carte ripetute', () => {
    expect(() => computeEquity(H('AhAd'), [{ kind: 'hand', cards: H('AhKd') }], [])).toThrow();
  });
});

describe('outs', () => {
  it('colore + scala bilaterale = 15 outs (54,1% entro il river); 6h è sporco perché appaia il board', () => {
    const o = countOuts(H('9h8h'), H('7h6c2h'))!;
    expect(o.strong).toBe(15);
    expect(o.clean).toBe(14);
    expect(o.outs.find((x) => x.dirty)!.card).toBe(H('6h')[0]);
    expect(o.weak).toBe(6); // 9 e 8 che fanno coppia
    expect(o.pBothAll! * 100).toBeCloseTo(54.12, 1);
    expect(o.pNextAll * 100).toBeCloseTo(31.91, 1);
  });
  it('progetto colore con board appaiato: outs sporchi', () => {
    const o = countOuts(H('AhKh'), H('7h7c2h'))!;
    expect(o.strong).toBe(9);
    expect(o.clean).toBe(0);
  });
  it('contro una mano nota conta le carte che mettono avanti', () => {
    const o = countOuts(H('AhKh'), H('QhJh2c3d'), H('2s2d'))!;
    expect(o.vsHand!.ahead).toBe(false);
    expect(o.vsHand!.outs.length).toBe(10);
  });
});
