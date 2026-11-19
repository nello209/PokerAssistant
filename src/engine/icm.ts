// ICM Malmuth-Harville per N giocatori, con programmazione dinamica sui sottoinsiemi (N ≤ ~14).

/** Montepremi = iscrizioni + rebuy effettivamente fatti. */
export function prizePool(entrants: number, buyIn: number, rebuys: number, rebuyCost: number): number {
  return Math.max(0, entrants) * Math.max(0, buyIn) + Math.max(0, rebuys) * Math.max(0, rebuyCost);
}

/** Divide il montepremi in percentuali, in euro interi; l'arrotondamento va al 1° premio. */
export function prizesFromPool(pool: number, percents: number[]): number[] {
  const rest = percents.slice(1).map((p) => Math.round((pool * p) / 100));
  return [Math.round((pool - rest.reduce((a, b) => a + b, 0)) * 100) / 100, ...rest];
}

/**
 * Restituisce, per ogni giocatore, il valore atteso in premi.
 * prob[mask] = probabilità che i giocatori in mask occupino (in qualche ordine) i primi |mask| posti.
 */
export function icm(stacks: number[], prizes: number[]): number[] {
  const n = stacks.length;
  if (n === 0) return [];
  if (n > 16) throw new Error('Troppi giocatori per ICM esatto');
  const total = stacks.reduce((a, b) => a + b, 0);
  if (total <= 0) return stacks.map(() => 0);
  const places = Math.min(prizes.length, n);
  const full = 1 << n;
  const prob = new Float64Array(full);
  const sumMask = new Float64Array(full);
  const pc = new Uint8Array(full);
  for (let m = 1; m < full; m++) {
    const low = m & -m, i = 31 - Math.clz32(low);
    sumMask[m] = sumMask[m ^ low] + stacks[i];
    pc[m] = pc[m ^ low] + 1;
  }
  const ev = new Array(n).fill(0);
  prob[0] = 1;
  for (let m = 0; m < full; m++) {
    const p = prob[m];
    if (p === 0 || pc[m] >= places) continue;
    const rem = total - sumMask[m];
    if (rem <= 0) continue;
    const place = pc[m];
    for (let i = 0; i < n; i++) {
      if (m & (1 << i) || stacks[i] <= 0) continue;
      const q = (p * stacks[i]) / rem;
      ev[i] += q * prizes[place];
      prob[m | (1 << i)] += q;
    }
  }
  return ev;
}

/** Probabilità di finire in ciascun posto (matrice giocatore × posto). */
export function finishProbabilities(stacks: number[]): number[][] {
  const n = stacks.length;
  return stacks.map((_, i) => {
    const row: number[] = [];
    for (let k = 0; k < n; k++) {
      const prizes = new Array(n).fill(0); prizes[k] = 1;
      row.push(icm(stacks, prizes)[i]);
    }
    return row;
  });
}

/** ICM a due giocatori (formula del foglio): secondo + quota × (primo − secondo). */
export const icmHeadsUp = (s1: number, s2: number, first: number, second: number) => second + (s1 / (s1 + s2)) * (first - second);
