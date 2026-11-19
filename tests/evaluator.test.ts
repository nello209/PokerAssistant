import { describe, it, expect } from 'vitest';
import { evaluate, categoryOf, describe as desc, bestFive } from '../src/engine/evaluator.ts';
import { parseCards } from '../src/engine/cards.ts';

const ev = (s: string) => evaluate(parseCards(s));

describe('valutatore', () => {
  it('riconosce le categorie', () => {
    expect(desc(ev('AsKsQsJsTs'))).toBe('Scala reale');
    expect(desc(ev('5h4h3h2hAh'))).toBe('Scala colore al Cinque');
    expect(desc(ev('9c9d9h9sKd'))).toBe('Poker di Nove');
    expect(desc(ev('QsQhQd4c4s'))).toBe('Full di Donne e Quattro');
    expect(desc(ev('AhJh8h6h3h'))).toBe("Colore all'Asso");
    expect(desc(ev('5c4d3h2sAc'))).toBe('Scala al Cinque');
    expect(desc(ev('7s7h7dKc2s'))).toBe('Tris di Sette');
    expect(desc(ev('AcAd9h9s4d'))).toBe('Doppia coppia, Assi e Nove');
    expect(desc(ev('JhJc8d5s2c'))).toBe('Coppia di Jack');
    expect(desc(ev('KsQd9c7h3s'))).toBe('Carta alta: Re');
  });

  it('ordina correttamente mani vicine', () => {
    expect(ev('AhAd KcQs 3h')).toBeGreaterThan(ev('AhAd KcQs 2h'));      // kicker
    expect(ev('AhAd KcJs Qh')).toBeGreaterThan(ev('AhAd KcQs 2h'));
    expect(ev('6c5d4h3s2c')).toBeGreaterThan(ev('5c4d3h2sAc'));          // 6-high > wheel
    expect(ev('Th9h8h7h6h')).toBeGreaterThan(ev('AsAhAdAcKd'));          // scala colore > poker
    expect(ev('2c2d2h3s3c')).toBeGreaterThan(ev('AhKhQhJh9h'));          // full > colore
    expect(ev('KcKdQhQs2c')).toBeGreaterThan(ev('KcKdJhJsAc'));          // doppia coppia
    expect(ev('AsKd8c8h8d')).toBe(ev('AcKh8s8h8d'));                      // pareggio
  });

  it('7 carte: sceglie le migliori 5', () => {
    expect(desc(ev('AhKh QhJh Th 2c 3d'))).toBe('Scala reale');
    expect(desc(ev('2c2d 2h 3s3c 3d Ah'))).toBe('Full di Tre e Due');
    expect(categoryOf(ev('9h8h 7h6c2h Kh 4d'))).toBe(5);
    const b = bestFive(parseCards('AsAd KhKc 7s 2d 9c'));
    expect(b.five.length).toBe(5);
    expect(desc(b.score)).toBe('Doppia coppia, Assi e Re');
  });

  it('distribuzione esatta di tutte le 2.598.960 mani da 5 carte', () => {
    const counts = new Array(9).fill(0);
    const h = [0, 0, 0, 0, 0];
    for (let a = 0; a < 52; a++) for (let b = a + 1; b < 52; b++) for (let c = b + 1; c < 52; c++)
      for (let d = c + 1; d < 52; d++) for (let e = d + 1; e < 52; e++) {
        h[0] = a; h[1] = b; h[2] = c; h[3] = d; h[4] = e;
        counts[evaluate(h, 5) >> 20]++;
      }
    expect(counts).toEqual([1302540, 1098240, 123552, 54912, 10200, 5108, 3744, 624, 40]);
  });

  it('distribuzione esatta di tutte le 133.784.560 mani da 7 carte', () => {
    const counts = new Array(9).fill(0);
    const h = new Int32Array(7);
    for (let a = 0; a < 46; a++) { h[0] = a;
      for (let b = a + 1; b < 47; b++) { h[1] = b;
        for (let c = b + 1; c < 48; c++) { h[2] = c;
          for (let d = c + 1; d < 49; d++) { h[3] = d;
            for (let e = d + 1; e < 50; e++) { h[4] = e;
              for (let f = e + 1; f < 51; f++) { h[5] = f;
                for (let g = f + 1; g < 52; g++) { h[6] = g; counts[evaluate(h, 7) >> 20]++; } } } } } } }
    expect(counts).toEqual([23294460, 58627800, 31433400, 6461620, 6180020, 4047644, 3473184, 224848, 41584]);
  }, 300000);
});
