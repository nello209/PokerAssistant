// Client del Web Worker: una richiesta di equity alla volta (quella nuova annulla la vecchia).
import type { EquityResult, Opponent } from '../engine/equity.ts';
import type { PushFoldParams, PushFoldResult } from '../engine/pushfold.ts';

type Pending = { resolve: (v: any) => void; reject: (e: Error) => void; onProgress?: (v: any) => void };

function makeWorker() {
  return new Worker(new URL('./calc.worker.ts', import.meta.url), { type: 'module' });
}

class Calc {
  private eqWorker: Worker | null = null;
  private pfWorker: Worker | null = null;
  private seq = 0;
  private pending = new Map<number, Pending>();
  private eqBusy: number | null = null;

  private attach(w: Worker) {
    w.onmessage = (ev) => {
      const { id, result, error, progress } = ev.data;
      const p = this.pending.get(id);
      if (!p) return;
      if (progress) { p.onProgress?.(result); return; }
      this.pending.delete(id);
      if (id === this.eqBusy) this.eqBusy = null;
      if (error) p.reject(new Error(error)); else p.resolve(result);
    };
    return w;
  }

  equity(hero: number[], opponents: Opponent[], board: number[], onProgress?: (r: EquityResult) => void): Promise<EquityResult> {
    // se c'è un calcolo in corso lo interrompiamo terminando il worker
    if (this.eqBusy !== null && this.eqWorker) {
      this.eqWorker.terminate();
      this.eqWorker = null;
      this.pending.get(this.eqBusy)?.reject(new Error('annullato'));
      this.pending.delete(this.eqBusy);
    }
    this.eqWorker ??= this.attach(makeWorker());
    const id = ++this.seq;
    this.eqBusy = id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, onProgress });
      this.eqWorker!.postMessage({ id, type: 'equity', hero, opponents: opponents.map(serializeOpp), board });
    });
  }

  pushFold(params: PushFoldParams): Promise<PushFoldResult> {
    this.pfWorker ??= this.attach(makeWorker());
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.pfWorker!.postMessage({ id, type: 'pushfold', params });
    });
  }
}

function serializeOpp(o: Opponent): Opponent {
  if (o.kind === 'range') return { kind: 'range', range: Array.from(o.range) };
  return o;
}

export const calc = new Calc();
