/// <reference lib="webworker" />
// Web Worker: calcoli pesanti fuori dal thread dell'interfaccia.
import { computeEquity, type Opponent } from '../engine/equity.ts';
import { buildTables, type PreflopTables } from '../engine/preflopEquity.ts';
import { solvePushFold, type PushFoldParams } from '../engine/pushfold.ts';
import eqData from '../data/preflop-equity.json';

let tables: PreflopTables | null = null;
const getTables = () => (tables ??= buildTables(eqData.data));
const pfCache = new Map<string, unknown>();

export type WorkerRequest =
  | { id: number; type: 'equity'; hero: number[]; opponents: Opponent[]; board: number[]; timeBudgetMs?: number }
  | { id: number; type: 'pushfold'; params: PushFoldParams };

self.onmessage = (ev: MessageEvent<WorkerRequest>) => {
  const msg = ev.data;
  try {
    if (msg.type === 'equity') {
      const res = computeEquity(msg.hero, msg.opponents, msg.board, {
        timeBudgetMs: msg.timeBudgetMs ?? 2500,
        onProgress: (r) => postMessage({ id: msg.id, progress: true, result: r }),
      });
      postMessage({ id: msg.id, result: res });
    } else if (msg.type === 'pushfold') {
      const key = JSON.stringify(msg.params);
      let res = pfCache.get(key);
      if (!res) { res = solvePushFold(getTables(), msg.params); pfCache.set(key, res); }
      postMessage({ id: msg.id, result: res });
    }
  } catch (e) {
    postMessage({ id: msg.id, error: (e as Error).message });
  }
};
