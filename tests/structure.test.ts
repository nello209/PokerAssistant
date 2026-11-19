import { describe, it, expect } from 'vitest';
import { generateStructure, type AnteMode } from '../src/engine/structure.ts';

const gen = (entrants: number, startingStack: number, hours: number, ante: AnteMode = 'none', levelMin = 0) =>
  generateStructure({ entrants, startingStack, hours, levelMin, ante });

describe('generatore struttura dei bui', () => {
  it('esempio della spiegazione: 8 × 10.000, 3 ore → 12 livelli da 15\', da 50/100 a 2.500/5.000', () => {
    const g = gen(8, 10000, 3);
    expect(g.planned).toBe(12);
    expect(g.levelMin).toBe(15);
    expect([g.levels[0].sb, g.levels[0].bb]).toEqual([50, 100]);
    expect([g.levels[11].sb, g.levels[11].bb]).toEqual([2500, 5000]);
    expect(g.startDepth).toBe(100);
  });

  const scenari: [number, number, number][] = [];
  for (const n of [2, 4, 6, 8, 10]) for (const st of [1500, 3000, 5000, 10000, 20000]) for (const h of [1, 2, 3, 4, 6]) scenari.push([n, st, h]);

  it('in ogni scenario: bui crescenti, SB = BB/2, durata entro il limite, fine vicina a T/15', () => {
    for (const [n, st, h] of scenari) for (const ante of ['none', 'testa', 'bb'] as AnteMode[]) {
      const g = gen(n, st, h, ante);
      const tag = `${n}×${st}, ${h}h, ${ante}`;
      expect(g.planned, tag).toBeGreaterThanOrEqual(3);
      expect(g.planned * g.levelMin, tag).toBeLessThanOrEqual(h * 60);
      for (let i = 0; i < g.levels.length; i++) {
        const l = g.levels[i];
        expect(l.bb, tag).toBe(l.sb * 2);
        expect(l.sb % g.minChip, tag).toBe(0);
        if (i) expect(l.bb, tag).toBeGreaterThan(g.levels[i - 1].bb);
        if (ante === 'none') expect(l.ante, tag).toBe(0);
        if (ante === 'bb' && l.ante) expect(l.ante, tag).toBe(l.bb);
        if (ante === 'testa' && l.ante) expect(l.ante, tag).toBeLessThan(l.bb / 4);
      }
      const ratio = g.totalChips / g.endBB; // ~15 = torneo finito
      expect(ratio, tag).toBeGreaterThan(5);
      expect(ratio, tag).toBeLessThan(30);
      expect(g.levels.filter((l) => l.extra).length, tag).toBe(4);
    }
  });

  it('le ante partono dopo i primi livelli', () => {
    const g = gen(8, 10000, 3, 'testa');
    expect(g.levels[0].ante).toBe(0);
    expect(g.levels[1].ante).toBe(0);
    expect(g.levels[g.planned - 1].ante).toBeGreaterThan(0);
  });

  it('poco tempo → parte più corto e avvisa', () => {
    const g = gen(9, 3000, 1);
    expect(g.startDepth).toBeLessThan(50);
    expect(g.warning).toBeTruthy();
  });

  it('durata dei livelli scelta a mano', () => {
    const g = gen(8, 10000, 4, 'none', 20);
    expect(g.levelMin).toBe(20);
    expect(g.planned).toBe(12);
  });

  it('esempio della spiegazione ante: 200/400, ante 50 a testa a 8 = BB ante 400 → piatto 1000', () => {
    expect(200 + 400 + 8 * 50).toBe(1000);
    expect(200 + 400 + 400).toBe(1000);
  });
});
