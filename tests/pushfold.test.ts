import { describe, it, expect } from 'vitest';
import { buildTables } from '../src/engine/preflopEquity.ts';
import { solvePushFold } from '../src/engine/pushfold.ts';
import { handIndex } from '../src/engine/ranges.ts';
import eq from '../src/data/preflop-equity.json';

const t = buildTables(eq.data);

describe('tabella preflop', () => {
  it('AA vs KK ≈ 82%, simmetria', () => {
    const AA = handIndex('AA'), KK = handIndex('KK');
    expect(t.E[AA * 169 + KK]).toBeGreaterThan(0.81);
    expect(t.E[AA * 169 + KK]).toBeLessThan(0.83);
    expect(t.E[AA * 169 + KK] + t.E[KK * 169 + AA]).toBeCloseTo(1, 4);
  });
  it('AA contro mano casuale ≈ 85%, 72o è fra le peggiori', () => {
    expect(t.vsRandom[handIndex('AA')]).toBeGreaterThan(0.84);
    expect(t.vsRandom[handIndex('AA')]).toBeLessThan(0.86);
    expect(t.order.indexOf(handIndex('72o'))).toBeGreaterThan(160);
  });
});

describe('Nash heads-up push/fold', () => {
  const hu = (S: number) => solvePushFold(t, { players: 2, behind: 1, stackBB: S, antePerPlayer: 0, bbAnte: 0 });
  it('10 BB senza ante: SB ~58%, BB ~37% (valori pubblicati)', () => {
    const r = hu(10);
    expect(r.pushPct).toBeGreaterThan(54);
    expect(r.pushPct).toBeLessThan(62);
    expect(r.calls[0].pct).toBeGreaterThan(33);
    expect(r.calls[0].pct).toBeLessThan(41);
    expect(r.push[handIndex('AA')]).toBe(1);
    expect(r.push[handIndex('72o')]).toBe(0);
  });
  it('più stack = range più stretto', () => {
    const p = [3, 6, 10, 15, 20].map((s) => hu(s).pushPct);
    for (let i = 1; i < p.length; i++) expect(p[i]).toBeLessThan(p[i - 1]);
  });
  it('con ante lo shove si allarga', () => {
    const a = solvePushFold(t, { players: 8, behind: 3, stackBB: 10, antePerPlayer: 0, bbAnte: 0 }).pushPct;
    const b = solvePushFold(t, { players: 8, behind: 3, stackBB: 10, antePerPlayer: 0, bbAnte: 1 }).pushPct;
    expect(b).toBeGreaterThan(a);
  });
  it('esempio della spiegazione: 8 BB a 8 giocatori, K9o shove dal bottone ma non da UTG', () => {
    for (const ante of [0, 0.1]) {
      const btn = solvePushFold(t, { players: 8, behind: 2, stackBB: 8, antePerPlayer: ante, bbAnte: 0 });
      const utg = solvePushFold(t, { players: 8, behind: 7, stackBB: 8, antePerPlayer: ante, bbAnte: 0 });
      expect(btn.push[handIndex('K9o')]).toBe(1);
      expect(utg.push[handIndex('K9o')]).toBeLessThan(0.25); // fold (al massimo uno shove raro, frequenza mista)
    }
  });
  it('da UTG si spinge meno che dal bottone', () => {
    const utg = solvePushFold(t, { players: 8, behind: 7, stackBB: 10, antePerPlayer: 0.1, bbAnte: 0 }).pushPct;
    const btn = solvePushFold(t, { players: 8, behind: 2, stackBB: 10, antePerPlayer: 0.1, bbAnte: 0 }).pushPct;
    expect(utg).toBeLessThan(btn);
  });
});
