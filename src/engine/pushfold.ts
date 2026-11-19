// Risolutore push/fold (equilibrio di Nash approssimato con fictitious play).
//
// Modello:
//  - Uno shove first-in da un posto con k giocatori dietro; tutti hanno almeno lo stack effettivo S.
//  - Chi è dietro può solo chiamare o foldare. Heads-up (k = 1) è l'equilibrio di Nash classico SB vs BB.
//  - Con k > 1 si considera solo il PRIMO giocatore che chiama (niente overcall né side pot), con
//    decisioni di call indipendenti fra loro: è un'APPROSSIMAZIONE dichiarata nell'interfaccia.
//  - Valori in chip-EV (niente ICM).
import type { PreflopTables } from './preflopEquity.ts';
import { seatsFor } from './positions.ts';

export interface PushFoldParams {
  players: number;      // giocatori al tavolo (2–10)
  behind: number;       // giocatori dietro lo shover (1 = SB)
  stackBB: number;      // stack effettivo in BB (prima di ante e bui)
  antePerPlayer: number; // ante a testa in BB (0 se assente)
  bbAnte: number;       // ante unico pagato dal BB, in BB (0 se assente; di solito 1)
  iterations?: number;
}

export interface PushFoldResult {
  push: Float32Array;        // frequenza di shove per classe
  calls: { seat: string; range: Float32Array; pct: number }[]; // range di call per ogni posto dietro
  evPush: Float32Array;      // EV dello shove rispetto al fold (BB), contro le call di equilibrio
  pushPct: number;
  potBB: number;
}

const pctOf = (r: Float32Array) => {
  let s = 0;
  for (let i = 0; i < 169; i++) { const r0 = Math.floor(i / 13), c = i % 13; s += r[i] * (r0 === c ? 6 : c > r0 ? 4 : 12); }
  return (100 * s) / 1326;
};

export function solvePushFold(t: PreflopTables, p: PushFoldParams): PushFoldResult {
  const { E, W } = t;
  const k = p.behind;
  const iters = p.iterations ?? 200;
  // nomi e bui dei posti dietro, nell'ordine in cui parlano
  const names: string[] = [];
  const blinds: number[] = [];
  const seatName = new Map(seatsFor(p.players).map((s) => [s.behind, s.name]));
  for (let b = k - 1; b >= 0; b--) {
    // b = giocatori dietro a quel posto
    names.push(seatName.get(b) ?? '?');
    blinds.push(b === 0 ? 1 : b === 1 && p.players > 2 ? 0.5 : 0);
  }
  const shoverBlind = k === 1 ? 0.5 : 0;
  const antes = p.antePerPlayer * p.players + p.bbAnte;
  const P0 = antes + 1.5;
  const X = Math.max(p.stackBB - p.antePerPlayer, 1); // importo dell'all-in (bui inclusi)
  // piatto finale se chiama il posto j
  const potIf = blinds.map((bj) => 2 * X + antes + (1.5 - shoverBlind - bj));
  // se l'effettivo è minore del BB stesso, il modello resta valido (all-in per meno)

  let push = new Float32Array(169).fill(1);
  let calls = names.map(() => new Float32Array(169).fill(0.3));
  const evPush = new Float32Array(169);

  const brCall = (j: number, pushR: Float32Array, out: Float32Array) => {
    const risk = X - blinds[j];
    for (let h = 0; h < 169; h++) {
      let num = 0, den = 0;
      const base = h * 169;
      for (let v = 0; v < 169; v++) {
        const w = W[base + v] * pushR[v];
        if (w > 0) { num += w * E[base + v]; den += w; }
      }
      if (den === 0) { out[h] = 0; continue; }
      out[h] = (num / den) * potIf[j] - risk > 0 ? 1 : 0;
    }
  };
  const pushEV = (callR: Float32Array[], out: Float32Array) => {
    const risk = X - shoverBlind;
    for (let h = 0; h < 169; h++) {
      const base = h * 169;
      let tot = 0;
      for (let v = 0; v < 169; v++) tot += W[base + v];
      let pFoldSoFar = 1, ev = 0;
      for (let j = 0; j < callR.length; j++) {
        let wc = 0, eqn = 0;
        const cr = callR[j];
        for (let v = 0; v < 169; v++) {
          const w = W[base + v] * cr[v];
          if (w > 0) { wc += w; eqn += w * E[base + v]; }
        }
        const pc = wc / tot;
        if (pc > 0) ev += pFoldSoFar * pc * ((eqn / wc) * potIf[j] - risk);
        pFoldSoFar *= 1 - pc;
      }
      ev += pFoldSoFar * P0;
      out[h] = ev;
    }
  };

  const tmp = new Float32Array(169);
  for (let n = 1; n <= iters; n++) {
    const a = 1 / (n + 1);
    for (let j = 0; j < calls.length; j++) {
      brCall(j, push, tmp);
      for (let h = 0; h < 169; h++) calls[j][h] += (tmp[h] - calls[j][h]) * a;
    }
    pushEV(calls, evPush);
    for (let h = 0; h < 169; h++) push[h] += ((evPush[h] > 0 ? 1 : 0) - push[h]) * a;
  }
  // arrotonda le frequenze (le mani "miste" restano con il loro peso)
  const clean = (r: Float32Array) => r.map((x) => (x > 0.85 ? 1 : x < 0.15 ? 0 : x));
  push = clean(push);
  calls = calls.map(clean);
  pushEV(calls, evPush);
  return {
    push,
    calls: calls.map((r, j) => ({ seat: names[j], range: r, pct: pctOf(r) })),
    evPush,
    pushPct: pctOf(push),
    potBB: P0,
  };
}
