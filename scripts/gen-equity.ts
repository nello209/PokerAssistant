// Genera src/data/preflop-equity.json: equity di ogni classe di mano (169) contro ogni altra,
// mediata su tutte le combinazioni compatibili (Monte Carlo, SAMPLES campioni per coppia).
// Uso: node scripts/gen-equity.ts [campioni]
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { evaluate } from '../src/engine/evaluator.ts';
import { combosOf } from '../src/engine/ranges.ts';

const SAMPLES = Number(process.argv[2] ?? 30000);

function work(rows: number[], samples: number): [number, Float32Array][] {
  const combos = Array.from({ length: 169 }, (_, i) => combosOf(i));
  const a7 = new Int32Array(7), b7 = new Int32Array(7), deck = new Int32Array(52), used = new Uint8Array(52);
  const out: [number, Float32Array][] = [];
  for (const i of rows) {
    const row = new Float32Array(169);
    for (let j = i; j < 169; j++) {
      let acc = 0, n = 0;
      while (n < samples) {
        const ca = combos[i][(Math.random() * combos[i].length) | 0];
        const cb = combos[j][(Math.random() * combos[j].length) | 0];
        if (ca[0] === cb[0] || ca[0] === cb[1] || ca[1] === cb[0] || ca[1] === cb[1]) continue;
        used.fill(0); used[ca[0]] = used[ca[1]] = used[cb[0]] = used[cb[1]] = 1;
        let nd = 0;
        for (let c = 0; c < 52; c++) if (!used[c]) deck[nd++] = c;
        a7[0] = ca[0]; a7[1] = ca[1]; b7[0] = cb[0]; b7[1] = cb[1];
        for (let k = 0; k < 5; k++) {
          const r = k + ((Math.random() * (nd - k)) | 0);
          const t = deck[k]; deck[k] = deck[r]; deck[r] = t;
          a7[2 + k] = b7[2 + k] = deck[k];
        }
        const sa = evaluate(a7, 7), sb = evaluate(b7, 7);
        acc += sa > sb ? 1 : sa === sb ? 0.5 : 0;
        n++;
      }
      row[j] = acc / samples;
    }
    out.push([i, row]);
  }
  return out;
}

if (isMainThread) {
  const t0 = Date.now();
  const nW = Math.max(1, availableParallelism() - 1);
  // distribuzione bilanciata: la riga i ha 169-i celle
  const buckets: number[][] = Array.from({ length: nW }, () => []);
  for (let i = 0; i < 169; i++) buckets[i % nW].push(i);
  const self = fileURLToPath(import.meta.url);
  const parts = await Promise.all(buckets.map((rows) => new Promise<[number, Float32Array][]>((res, rej) => {
    const w = new Worker(self, { workerData: { rows, samples: SAMPLES } });
    w.on('message', res); w.on('error', rej);
  })));
  const E = new Float32Array(169 * 169);
  for (const part of parts) for (const [i, row] of part) for (let j = i; j < 169; j++) {
    E[i * 169 + j] = row[j];
    E[j * 169 + i] = 1 - row[j];
  }
  for (let i = 0; i < 169; i++) E[i * 169 + i] = 0.5;
  const u16 = new Uint16Array(169 * 169);
  for (let k = 0; k < u16.length; k++) u16[k] = Math.round(E[k] * 65535);
  const b64 = Buffer.from(u16.buffer).toString('base64');
  const outPath = fileURLToPath(new URL('../src/data/preflop-equity.json', import.meta.url));
  writeFileSync(outPath, JSON.stringify({
    descrizione: 'Equity preflop classe vs classe (169x169), riga contro colonna, mediata sulle combinazioni compatibili. Uint16 little-endian /65535, base64.',
    campioniPerCoppia: SAMPLES,
    data: b64,
  }));
  console.log(`Fatto in ${((Date.now() - t0) / 1000).toFixed(1)} s con ${nW} thread → ${outPath}`);
  const AA = 0, KK = 14;
  console.log('AA vs KK', E[AA * 169 + KK].toFixed(4));
} else {
  parentPort!.postMessage(work(workerData.rows, workerData.samples));
}
