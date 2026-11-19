// Carica la matrice di equity preflop 169x169 e i pesi di compatibilità (rimozione carte).
import { combosOf, comboCount } from './ranges.ts';

export interface PreflopTables {
  /** E[i*169+j] = equity della classe i contro la classe j */
  E: Float32Array;
  /** W[i*169+j] = numero di coppie di combinazioni compatibili (senza carte in comune) */
  W: Float32Array;
  /** equity contro una mano casuale, per ordinare le mani */
  vsRandom: Float32Array;
  /** classi ordinate dalla più forte alla più debole (vs mano casuale) */
  order: number[];
}

function decode(b64: string): Float32Array {
  let bytes: Uint8Array;
  if (typeof atob === 'function') {
    const bin = atob(b64);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } else {
    bytes = new Uint8Array((globalThis as any).Buffer.from(b64, 'base64'));
  }
  const u16 = new Uint16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
  const E = new Float32Array(u16.length);
  for (let k = 0; k < u16.length; k++) E[k] = u16[k] / 65535;
  return E;
}

export function buildTables(b64: string): PreflopTables {
  const E = decode(b64);
  const W = new Float32Array(169 * 169);
  const cs = Array.from({ length: 169 }, (_, i) => combosOf(i));
  for (let i = 0; i < 169; i++) for (let j = i; j < 169; j++) {
    let n = 0;
    for (const [a, b] of cs[i]) for (const [c, d] of cs[j]) if (a !== c && a !== d && b !== c && b !== d) n++;
    W[i * 169 + j] = n; W[j * 169 + i] = n;
  }
  const vsRandom = new Float32Array(169);
  for (let i = 0; i < 169; i++) {
    let s = 0, w = 0;
    for (let j = 0; j < 169; j++) { const ww = W[i * 169 + j]; s += ww * E[i * 169 + j]; w += ww; }
    vsRandom[i] = s / w;
  }
  const order = Array.from({ length: 169 }, (_, i) => i).sort((a, b) => vsRandom[b] - vsRandom[a]);
  return { E, W, vsRandom, order };
}

/** Range composto dalle migliori mani fino a pct% delle combinazioni (ordinate per equity vs casuale). */
export function topPercentRange(t: PreflopTables, pct: number): Float32Array {
  const r = new Float32Array(169);
  const target = (pct / 100) * 1326;
  let acc = 0;
  for (const i of t.order) {
    if (acc >= target - 1e-9) break;
    r[i] = 1; acc += comboCount(i);
  }
  return r;
}
