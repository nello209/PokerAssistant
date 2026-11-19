// Conteggio automatico degli outs dal flop o dal turn.
import { type Card, makeCard } from './cards.ts';
import { evaluate, describe, categoryOf, CAT } from './evaluator.ts';
import { hitOneCard, hitTwoCards } from './odds.ts';

export interface Out {
  card: Card;
  newScore: number;
  label: string;
  strong: boolean;   // scala o meglio
  dirty: boolean;    // può completare una mano migliore all'avversario
  note?: string;
}

export interface OutsResult {
  currentScore: number;
  currentLabel: string;
  outs: Out[];
  clean: number;   // forti e puliti
  strong: number;  // forti (puliti + sporchi)
  weak: number;    // miglioramenti minori (coppia, doppia, tris)
  street: 'flop' | 'turn';
  pNext: number;   // prossima carta, con gli outs puliti
  pBoth: number | null; // flop → river (solo dal flop)
  pNextAll: number; // con tutti gli outs forti
  pBothAll: number | null;
  vsHand?: { outs: Card[]; ahead: boolean };
}

function suitCounts(cards: Card[]): number[] {
  const s = [0, 0, 0, 0];
  for (const c of cards) s[c & 3]++;
  return s;
}

export function countOuts(hero: Card[], board: Card[], villain?: Card[]): OutsResult | null {
  if (hero.length !== 2 || (board.length !== 3 && board.length !== 4)) return null;
  const dead = new Set<Card>([...hero, ...board, ...(villain ?? [])]);
  const cur = evaluate([...hero, ...board]);
  const curCat = categoryOf(cur);
  const outs: Out[] = [];
  let weak = 0;
  for (let r = 0; r < 13; r++) for (let s = 0; s < 4; s++) {
    const c = makeCard(r, s);
    if (dead.has(c)) continue;
    const ns = evaluate([...hero, ...board, c]);
    const nb = [...board, c];
    const boardScore = evaluate(nb);
    const nCat = categoryOf(ns);
    if (nCat <= curCat || nCat <= categoryOf(boardScore)) continue;
    const strong = nCat >= CAT.STRAIGHT;
    if (!strong) {
      weak++;
      outs.push({ card: c, newScore: ns, label: describe(ns), strong, dirty: false });
      continue;
    }
    let dirty = false, note: string | undefined;
    const boardPaired = new Set(nb.map((x) => x >> 2)).size < nb.length;
    const maxSuit = Math.max(...suitCounts(nb));
    if ((nCat === CAT.STRAIGHT || nCat === CAT.FLUSH) && boardPaired) { dirty = true; note = 'board appaiato: possibile full'; }
    else if (nCat === CAT.STRAIGHT && maxSuit >= 3) { dirty = true; note = 'tre carte dello stesso seme: possibile colore'; }
    outs.push({ card: c, newScore: ns, label: describe(ns), strong, dirty, note });
  }
  const strongN = outs.filter((o) => o.strong).length;
  const clean = outs.filter((o) => o.strong && !o.dirty).length;
  const street = board.length === 3 ? 'flop' : 'turn';
  const unseen = street === 'flop' ? 47 : 46;
  const res: OutsResult = {
    currentScore: cur, currentLabel: describe(cur), outs, clean, strong: strongN, weak, street,
    pNext: hitOneCard(clean, unseen),
    pBoth: street === 'flop' ? hitTwoCards(clean, 47) : null,
    pNextAll: hitOneCard(strongN, unseen),
    pBothAll: street === 'flop' ? hitTwoCards(strongN, 47) : null,
  };
  if (villain && villain.length === 2) {
    const vs = evaluate([...villain, ...board]);
    const ahead = cur > vs;
    const list: Card[] = [];
    if (!ahead) {
      for (let c = 0; c < 52; c++) {
        if (dead.has(c)) continue;
        if (evaluate([...hero, ...board, c]) > evaluate([...villain, ...board, c])) list.push(c);
      }
    }
    res.vsHand = { outs: list, ahead };
  }
  return res;
}
