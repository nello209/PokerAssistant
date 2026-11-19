// Calcolo equity: enumerazione esatta quando i casi sono pochi, Monte Carlo altrimenti.
import type { Card } from './cards.ts';
import { evaluate } from './evaluator.ts';
import { type Range, combosOf } from './ranges.ts';

export type Opponent =
  | { kind: 'hand'; cards: Card[] }
  | { kind: 'range'; range: Range | number[] }
  | { kind: 'random' };

export interface EquityResult {
  /** equity (vincite + quota pareggi) per giocatore: [eroe, avv1, avv2, …] */
  equity: number[];
  win: number[];
  tie: number[];
  method: 'esatto' | 'montecarlo';
  samples: number;
  /** errore standard sull'equity dell'eroe (0 se esatto) */
  stderr: number;
  done: boolean;
}

export interface EquityOptions {
  maxExactEvals?: number;
  maxSamples?: number;
  timeBudgetMs?: number;
  onProgress?: (r: EquityResult) => void;
  progressEveryMs?: number;
}

function combinationsCount(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return Math.round(r);
}

interface WeightedCombos { cards: Int32Array; weights: Float64Array; cum: Float64Array; n: number }

function buildCombos(opp: Opponent, dead: Uint8Array): WeightedCombos {
  const list: number[] = [], w: number[] = [];
  for (let i = 0; i < 169; i++) {
    const wt = opp.kind === 'random' ? 1 : (opp as { range: ArrayLike<number> }).range[i];
    if (!(wt > 0)) continue;
    for (const [a, b] of combosOf(i)) {
      if (dead[a] || dead[b]) continue;
      list.push(a, b); w.push(wt);
    }
  }
  const n = w.length, cum = new Float64Array(n);
  let s = 0;
  for (let i = 0; i < n; i++) { s += w[i]; cum[i] = s; }
  return { cards: Int32Array.from(list), weights: Float64Array.from(w), cum, n };
}

export function computeEquity(hero: Card[], opponents: Opponent[], board: Card[], opts: EquityOptions = {}): EquityResult {
  const maxExact = opts.maxExactEvals ?? 6_000_000;
  const maxSamples = opts.maxSamples ?? 2_000_000;
  const budget = opts.timeBudgetMs ?? 2500;
  const progressEvery = opts.progressEveryMs ?? 150;
  const np = opponents.length + 1;
  if (hero.length !== 2) throw new Error('Servono 2 carte per la mano');
  if (opponents.length < 1) throw new Error('Serve almeno un avversario');
  if (board.length > 5) throw new Error('Board massimo 5 carte');

  const dead = new Uint8Array(52);
  const markDead = (c: Card) => {
    if (dead[c]) throw new Error('Carta ripetuta');
    dead[c] = 1;
  };
  hero.forEach(markDead); board.forEach(markDead);
  const fixed: (Card[] | null)[] = [hero];
  for (const o of opponents) {
    if (o.kind === 'hand') { if (o.cards.length !== 2) throw new Error('Mano avversaria incompleta'); o.cards.forEach(markDead); fixed.push(o.cards); }
    else fixed.push(null);
  }
  const rangeIdx = fixed.map((f, i) => (f ? -1 : i)).filter((i) => i >= 0);
  const combos: (WeightedCombos | null)[] = fixed.map((f, i) => (f ? null : buildCombos(opponents[i - 1], dead)));
  for (const c of combos) if (c && c.n === 0) throw new Error('Range avversario vuoto (o tutte le carte già usate)');

  const need = 5 - board.length;
  const live: Card[] = [];
  for (let c = 0; c < 52; c++) if (!dead[c]) live.push(c);

  // buffer 7 carte per giocatore: [c1, c2, b1..b5]
  const bufs = Array.from({ length: np }, () => new Int32Array(7));
  for (let p = 0; p < np; p++) {
    if (fixed[p]) { bufs[p][0] = fixed[p]![0]; bufs[p][1] = fixed[p]![1]; }
    for (let k = 0; k < board.length; k++) bufs[p][2 + k] = board[k];
  }
  const eqAcc = new Float64Array(np), winAcc = new Float64Array(np), tieAcc = new Float64Array(np);
  const scores = new Int32Array(np);
  let totalW = 0;
  let heroSq = 0; // per varianza

  const showdown = (weight: number) => {
    let best = -1, cnt = 0;
    for (let p = 0; p < np; p++) {
      const s = evaluate(bufs[p], 7);
      scores[p] = s;
      if (s > best) { best = s; cnt = 1; } else if (s === best) cnt++;
    }
    const share = weight / cnt;
    for (let p = 0; p < np; p++) if (scores[p] === best) {
      eqAcc[p] += share;
      if (cnt === 1) winAcc[p] += weight; else tieAcc[p] += weight;
    }
    totalW += weight;
    const he = scores[0] === best ? 1 / cnt : 0;
    heroSq += weight * he * he;
  };

  const setBoardCard = (k: number, c: Card) => { for (let p = 0; p < np; p++) bufs[p][2 + board.length + k] = c; };

  const result = (method: 'esatto' | 'montecarlo', samples: number, done: boolean): EquityResult => {
    const eq = Array.from(eqAcc, (v) => v / totalW);
    let stderr = 0;
    if (method === 'montecarlo' && samples > 1) {
      const m = eq[0], v = heroSq / totalW - m * m;
      stderr = Math.sqrt(Math.max(v, 0) / samples);
    }
    return { equity: eq, win: Array.from(winAcc, (v) => v / totalW), tie: Array.from(tieAcc, (v) => v / totalW), method, samples, stderr, done };
  };

  // enumerazione delle carte del board da un array di carte vive
  const enumBoards = (cards: Card[], weight: number) => {
    const n = cards.length;
    if (need === 0) { showdown(weight); return; }
    const rec = (start: number, k: number) => {
      for (let i = start; i <= n - (need - k); i++) {
        setBoardCard(k, cards[i]);
        if (k + 1 === need) showdown(weight); else rec(i + 1, k + 1);
      }
    };
    rec(0, 0);
  };

  // --- Caso esatto 1: tutte mani precise
  if (rangeIdx.length === 0) {
    const nb = combinationsCount(live.length, need);
    if (nb * np <= maxExact) {
      enumBoards(live, 1);
      return result('esatto', nb, true);
    }
  }
  // --- Caso esatto 2: un solo avversario a range
  if (rangeIdx.length === 1) {
    const ri = rangeIdx[0], wc = combos[ri]!;
    const nb = combinationsCount(live.length - 2, need);
    if (wc.n * nb * np <= maxExact) {
      for (let k = 0; k < wc.n; k++) {
        const a = wc.cards[2 * k], b = wc.cards[2 * k + 1];
        bufs[ri][0] = a; bufs[ri][1] = b;
        enumBoards(live.filter((c) => c !== a && c !== b), wc.weights[k]);
      }
      return result('esatto', wc.n * nb, true);
    }
  }

  // --- Monte Carlo
  const used = new Uint8Array(52);
  const deck = new Int32Array(52);
  const t0 = Date.now();
  let lastProg = t0, samples = 0, rejects = 0;
  const pick = (wc: WeightedCombos) => {
    const x = Math.random() * wc.cum[wc.n - 1];
    let lo = 0, hi = wc.n - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (wc.cum[mid] < x) lo = mid + 1; else hi = mid; }
    return lo;
  };
  while (samples < maxSamples) {
    used.set(dead);
    let ok = true;
    for (const ri of rangeIdx) {
      const wc = combos[ri]!;
      let tries = 0, k: number, a: number, b: number;
      do { k = pick(wc); a = wc.cards[2 * k]; b = wc.cards[2 * k + 1]; tries++; } while ((used[a] || used[b]) && tries < 200);
      if (used[a] || used[b]) { ok = false; break; }
      used[a] = 1; used[b] = 1; bufs[ri][0] = a; bufs[ri][1] = b;
    }
    if (!ok) { if (++rejects > 10000 && samples === 0) throw new Error('Range incompatibili fra loro'); continue; }
    let nd = 0;
    for (let c = 0; c < 52; c++) if (!used[c]) deck[nd++] = c;
    for (let k = 0; k < need; k++) {
      const j = k + Math.floor(Math.random() * (nd - k));
      const t = deck[k]; deck[k] = deck[j]; deck[j] = t;
      setBoardCard(k, deck[k]);
    }
    showdown(1);
    samples++;
    if ((samples & 1023) === 0) {
      const now = Date.now();
      if (opts.onProgress && now - lastProg > progressEvery) { lastProg = now; opts.onProgress(result('montecarlo', samples, false)); }
      if (now - t0 > budget) break;
    }
  }
  return result('montecarlo', samples, true);
}
