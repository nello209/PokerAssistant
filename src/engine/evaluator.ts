// Valutatore veloce di mani da 5, 6 o 7 carte basato su maschere di bit.
// Il punteggio è un intero: più alto = mano migliore. category = score >> 20.
import { type Card, rankOf, suitOf } from './cards.ts';

export const CAT = {
  HIGH: 0, PAIR: 1, TWO_PAIR: 2, TRIPS: 3, STRAIGHT: 4, FLUSH: 5, FULL: 6, QUADS: 7, STRAIGHT_FLUSH: 8,
} as const;

export const CATEGORY_NAMES = [
  'Carta alta', 'Coppia', 'Doppia coppia', 'Tris', 'Scala', 'Colore', 'Full', 'Poker', 'Scala colore',
];

const STRAIGHT_HIGH = new Int8Array(8192);
const TOP5 = new Int32Array(8192);
const POP = new Uint8Array(8192);

for (let m = 0; m < 8192; m++) {
  let best = -1;
  for (let h = 12; h >= 4; h--) {
    const w = 0x1f << (h - 4);
    if ((m & w) === w) { best = h; break; }
  }
  if (best < 0 && (m & 0x100f) === 0x100f) best = 3; // A-2-3-4-5
  STRAIGHT_HIGH[m] = best;
  let packed = 0, k = 0, pop = 0;
  for (let r = 12; r >= 0; r--) {
    if (m & (1 << r)) {
      pop++;
      if (k < 5) { packed |= r << (16 - 4 * k); k++; }
    }
  }
  TOP5[m] = packed;
  POP[m] = pop;
}

const hi = (x: number) => 31 - Math.clz32(x);

/** Valuta le prime n carte dell'array (5 ≤ n ≤ 7; funziona anche con meno carte). */
export function evaluate(cards: ArrayLike<Card>, n: number = cards.length): number {
  let s1 = 0, s2 = 0, s3 = 0, s4 = 0;
  let f0 = 0, f1 = 0, f2 = 0, f3 = 0;
  for (let i = 0; i < n; i++) {
    const c = cards[i];
    const bit = 1 << (c >> 2);
    switch (c & 3) {
      case 0: f0 |= bit; break;
      case 1: f1 |= bit; break;
      case 2: f2 |= bit; break;
      default: f3 |= bit;
    }
    if (s1 & bit) {
      if (s2 & bit) {
        if (s3 & bit) s4 |= bit; else s3 |= bit;
      } else s2 |= bit;
    } else s1 |= bit;
  }
  // Colore (con ≤7 carte esclude full e poker)
  let fm = 0;
  if (POP[f0] >= 5) fm = f0;
  else if (POP[f1] >= 5) fm = f1;
  else if (POP[f2] >= 5) fm = f2;
  else if (POP[f3] >= 5) fm = f3;
  if (fm) {
    const sf = STRAIGHT_HIGH[fm];
    if (sf >= 0) return (8 << 20) | sf;
    return (5 << 20) | TOP5[fm];
  }
  if (s4) {
    const q = hi(s4);
    return (7 << 20) | (q << 16) | (((TOP5[s1 & ~(1 << q)] >> 16) & 0xf) << 12);
  }
  if (s3) {
    const t = hi(s3);
    const rest = s2 & ~(1 << t);
    if (rest) return (6 << 20) | (t << 16) | (hi(rest) << 12);
    const st = STRAIGHT_HIGH[s1];
    if (st >= 0) return (4 << 20) | st;
    return (3 << 20) | (t << 16) | (((TOP5[s1 & ~(1 << t)] >> 12) & 0xff) << 8);
  }
  const st = STRAIGHT_HIGH[s1];
  if (st >= 0) return (4 << 20) | st;
  if (s2) {
    const p1 = hi(s2);
    const r2 = s2 & ~(1 << p1);
    if (r2) {
      const p2 = hi(r2);
      return (2 << 20) | (p1 << 16) | (p2 << 12) | (((TOP5[s1 & ~((1 << p1) | (1 << p2))] >> 16) & 0xf) << 8);
    }
    return (1 << 20) | (p1 << 16) | (((TOP5[s1 & ~(1 << p1)] >> 8) & 0xfff) << 4);
  }
  return TOP5[s1];
}

export const categoryOf = (score: number) => score >> 20;

const RANK_SING = ['Due', 'Tre', 'Quattro', 'Cinque', 'Sei', 'Sette', 'Otto', 'Nove', 'Dieci', 'Jack', 'Donna', 'Re', 'Asso'];
const RANK_PLUR = ['Due', 'Tre', 'Quattro', 'Cinque', 'Sei', 'Sette', 'Otto', 'Nove', 'Dieci', 'Jack', 'Donne', 'Re', 'Assi'];
const al = (r: number) => (r === 12 ? "all'Asso" : r === 10 ? 'alla Donna' : r === 11 ? 'al Re' : r === 9 ? 'al Jack' : 'al ' + RANK_SING[r]);

/** Descrizione in italiano del punteggio. */
export function describe(score: number): string {
  const cat = score >> 20;
  const a = (score >> 16) & 0xf, b = (score >> 12) & 0xf;
  switch (cat) {
    case 8: return (score & 0xf) === 12 ? 'Scala reale' : 'Scala colore ' + al(score & 0xf);
    case 7: return 'Poker di ' + RANK_PLUR[a];
    case 6: return `Full di ${RANK_PLUR[a]} e ${RANK_PLUR[b]}`;
    case 5: return 'Colore ' + al(a);
    case 4: return 'Scala ' + al(score & 0xf);
    case 3: return 'Tris di ' + RANK_PLUR[a];
    case 2: return `Doppia coppia, ${RANK_PLUR[a]} e ${RANK_PLUR[b]}`;
    case 1: return 'Coppia di ' + RANK_PLUR[a];
    default: return 'Carta alta: ' + RANK_SING[a];
  }
}

/** Le 5 carte che formano il punto migliore (per evidenziarle nell'interfaccia). */
export function bestFive(cards: Card[]): { score: number; five: Card[] } {
  if (cards.length <= 5) return { score: evaluate(cards), five: cards.slice() };
  let best = -1, five: Card[] = [];
  const n = cards.length, tmp = [0, 0, 0, 0, 0];
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++)
    for (let d = c + 1; d < n; d++) for (let e = d + 1; e < n; e++) {
      tmp[0] = cards[a]; tmp[1] = cards[b]; tmp[2] = cards[c]; tmp[3] = cards[d]; tmp[4] = cards[e];
      const s = evaluate(tmp, 5);
      if (s > best) { best = s; five = tmp.slice(); }
    }
  return { score: best, five };
}

export { rankOf, suitOf };
