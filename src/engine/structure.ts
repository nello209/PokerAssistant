// Generatore di strutture dei bui per tornei casalinghi.
//
// Idea: le fiches totali sono T = partecipanti × stack iniziale. Il torneo è praticamente finito quando
// il big blind arriva a circa T/15 (in heads-up ognuno avrebbe in media ~7 BB). Si fissa quel valore
// alla durata massima e si fa crescere il BB in modo geometrico dal valore iniziale (stack/profondità)
// a quello finale, poi si arrotondano i bui a valori "da fiches" (25/50, 75/150, 100/200…).

export type AnteMode = 'none' | 'testa' | 'bb';

export interface GenParams {
  entrants: number;        // partecipanti al torneo
  startingStack: number;   // fiches a testa
  hours: number;           // durata massima desiderata
  levelMin: number;        // 0 = automatico
  ante: AnteMode;
  /** rebuy previsti in tutto il torneo (ognuno aggiunge uno stack iniziale di fiches) */
  rebuys?: number;
}

export interface GenLevel { sb: number; bb: number; ante: number; min: number; extra?: boolean }

export interface GenResult {
  levels: GenLevel[];       // livelli previsti + qualche livello "di riserva"
  planned: number;          // quanti livelli stanno nella durata massima
  levelMin: number;
  startDepth: number;       // BB iniziali di ogni giocatore
  growth: number;           // crescita media del BB a ogni livello (es. 1,3 = +30%)
  totalChips: number;
  endBB: number;            // BB dell'ultimo livello previsto
  minChip: number;          // fiche più piccola necessaria
  warning?: string;
}

const MANTISSAS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 8];
const CHIP_UNITS = [1, 5, 10, 25, 50, 100, 500, 1000, 5000];

/** Valori "belli" per il small blind, multipli della fiche più piccola. */
function niceSmallBlinds(minChip: number, max: number): number[] {
  const out = new Set<number>();
  for (let e = 0; e <= 9; e++) for (const m of MANTISSAS) {
    const v = Math.round(m * 10 ** e);
    if (v >= minChip && v <= max && v % minChip === 0) out.add(v);
  }
  return [...out].sort((a, b) => a - b);
}

function pickMinChip(startSB: number): number {
  // da SB 50 in su si usa una fiche pari a metà SB, così la salita è più graduale (50/100 → 75/150)
  const cap = startSB >= 50 ? startSB / 2 : startSB;
  let best = 1;
  for (const u of CHIP_UNITS) if (u <= cap && startSB % u === 0) best = u;
  return best;
}

function nearestNice(values: number[], target: number, greaterThan: number): number {
  let best = -1, bestD = Infinity;
  for (const v of values) {
    if (v <= greaterThan) continue;
    const d = Math.abs(Math.log(v / target));
    if (d < bestD) { bestD = d; best = v; }
  }
  return best > 0 ? best : values[values.length - 1];
}

/** SB iniziale "bello" vicino a stack/(2·profondità). */
function startSmallBlind(stack: number, depth: number): number {
  const target = stack / depth / 2;
  const all = niceSmallBlinds(1, stack);
  return nearestNice(all, target, 0);
}

export function generateStructure(p: GenParams): GenResult {
  const entrants = Math.max(2, Math.round(p.entrants));
  const stack = Math.max(10, p.startingStack);
  const minutes = Math.max(30, p.hours * 60);
  const T = (entrants + Math.max(0, Math.round(p.rebuys ?? 0))) * stack;
  const endBBTarget = T / 15;
  const levelOptions = p.levelMin > 0 ? [p.levelMin] : [30, 25, 20, 15, 12, 10];
  const depths = [100, 75, 50, 40, 30, 20];

  let chosen: { depth: number; levelMin: number; n: number; r: number; sb0: number } | null = null;
  outer: for (const depth of depths) {
    const sb0 = startSmallBlind(stack, depth);
    const bb0 = sb0 * 2;
    for (const lm of levelOptions) {
      const n = Math.floor(minutes / lm);
      if (n < 3) continue;
      const r = Math.pow(endBBTarget / bb0, 1 / (n - 1));
      if (r <= 1.45) { chosen = { depth, levelMin: lm, n, r: Math.max(r, 1.05), sb0 }; break outer; }
    }
  }
  let warning: string | undefined;
  if (!chosen) {
    const lm = levelOptions[levelOptions.length - 1];
    const n = Math.max(3, Math.floor(minutes / lm));
    const sb0 = startSmallBlind(stack, 20);
    chosen = { depth: 20, levelMin: lm, n, r: Math.pow(endBBTarget / (sb0 * 2), 1 / (n - 1)), sb0 };
    warning = 'Il tempo è molto poco per questi stack: i bui salgono in fretta e si gioca quasi subito a push/fold. Valuta più tempo o stack iniziali più piccoli.';
  } else if (chosen.depth <= 40) {
    warning = `Per stare nel tempo si parte con ${chosen.depth} BB a testa invece di 100: torneo veloce, poco gioco postflop.`;
  }

  const minChip = pickMinChip(chosen.sb0);
  const nice = niceSmallBlinds(minChip, T);
  const extra = 4;
  const levels: GenLevel[] = [];
  let prevSB = 0;
  const anteFrom = Math.max(2, Math.round(chosen.n * 0.3));
  for (let i = 0; i < chosen.n + extra; i++) {
    const targetSB = chosen.sb0 * Math.pow(chosen.r, i);
    const sb = i === 0 ? chosen.sb0 : nearestNice(nice, targetSB, prevSB);
    prevSB = sb;
    const bb = sb * 2;
    let ante = 0;
    if (i >= anteFrom) {
      if (p.ante === 'bb') ante = bb;
      else if (p.ante === 'testa') ante = Math.max(minChip, nearestNice(nice, bb / 8, 0));
    }
    levels.push({ sb, bb, ante, min: chosen.levelMin, ...(i >= chosen.n ? { extra: true } : {}) });
  }
  const last = levels[chosen.n - 1];
  return {
    levels, planned: chosen.n, levelMin: chosen.levelMin, startDepth: stack / levels[0].bb,
    growth: chosen.r, totalChips: T, endBB: last.bb, minChip, warning,
  };
}

/** "1:40" a partire dai minuti. */
export const fmtClock = (mins: number) => `${Math.floor(mins / 60)}:${String(Math.round(mins % 60)).padStart(2, '0')}`;
