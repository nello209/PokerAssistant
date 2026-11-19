// Gli esempi numerici delle spiegazioni "Cos'è?" devono essere veri.
import { describe, it, expect } from 'vitest';
import { computeEquity } from '../src/engine/equity.ts';
import { parseCards } from '../src/engine/cards.ts';
import { requiredEquityFromPot, hitOneCard, hitTwoCards, spr } from '../src/engine/odds.ts';
import { icm } from '../src/engine/icm.ts';
import { parseRange, rangePercent } from '../src/engine/ranges.ts';
import { evaluate, describe as desc } from '../src/engine/evaluator.ts';
import rangesData from '../src/data/ranges.json';
import spiegazioni from '../src/data/spiegazioni.json';

describe('esempi delle spiegazioni', () => {
  it('ogni voce ha titolo, testo, esempio e consiglio', () => {
    for (const v of Object.values(spiegazioni.voci)) {
      expect(v.titolo.length).toBeGreaterThan(3);
      expect(v.testo.length).toBeGreaterThan(0);
      expect(v.esempio.length).toBeGreaterThan(10);
      expect(v.alTavolo.length).toBeGreaterThan(10);
    }
  });
  it('barra: 6000 fiches a 100/200 = 30 BB; effettivo 2400 = 12 BB', () => {
    expect(6000 / 200).toBe(30);
    expect(Math.min(6000, 2400) / 200).toBe(12);
  });
  it('profili: UTG 9,4% vs 16,3%', () => {
    expect(rangePercent(parseRange(rangesData.profili.prudente.range.b7))).toBeCloseTo(9.4, 1);
    expect(rangePercent(parseRange(rangesData.profili.standard.range.b7))).toBeCloseTo(16.3, 1);
  });
  it('range: AJo è nel range UTG prudente', () => {
    expect(parseRange(rangesData.profili.prudente.range.b7)[parseRange('AJo').indexOf(1)]).toBe(1);
  });
  it('fasce: 33 e 65s non sono aperti da UTG a 25 BB', () => {
    // la fascia 20–40 toglie 44-22 e i suited connector bassi dai posti con 4+ giocatori dietro
    const rm = parseRange(rangesData.fasce[1].rimuovi![0].mani);
    expect(rm[parseRange('33').indexOf(1)]).toBe(1);
    expect(rm[parseRange('65s').indexOf(1)]).toBe(1);
  });
  it('cosa ho: KhQh su Kc 7d 2s = coppia di Re', () => {
    expect(desc(evaluate(parseCards('KhQhKc7d2s')))).toBe('Coppia di Re');
  });
  it('outs: 9 outs → 19% / 35%', () => {
    expect(Math.round(hitOneCard(9, 47) * 100)).toBe(19);
    expect(Math.round(hitTwoCards(9) * 100)).toBe(35);
  });
  it('equity: AA vs KK ≈ 82% (media sui semi: 81,5–82,6% a seconda dei semi in comune)', () => {
    const a = computeEquity(parseCards('AsAh'), [{ kind: 'hand', cards: parseCards('KdKc') }], []).equity[0];
    const b = computeEquity(parseCards('AsAh'), [{ kind: 'hand', cards: parseCards('KsKh') }], []).equity[0];
    expect(a).toBeGreaterThan(0.81); expect(a).toBeLessThan(0.83);
    expect(b).toBeGreaterThan(0.81); expect(b).toBeLessThan(0.83);
  });
  it('pot odds: piatto 300 (con la sua puntata 100), call 100 → 25%', () => {
    expect(requiredEquityFromPot(300, 100)).toBeCloseTo(0.25, 10);
  });
  it('ICM: 5000/3000/2000 con 50/30/20 → il primo vale 38,4', () => {
    expect(icm([5000, 3000, 2000], [50, 30, 20])[0]).toBeCloseTo(38.4, 1);
  });
  it('SPR: 2500 / 1000 = 2,5', () => expect(spr(2500, 1000)).toBe(2.5));
});
