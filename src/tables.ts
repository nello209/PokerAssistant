// Tabelle preflop sul thread principale (caricate in modo pigro, servono per "Top %").
import { buildTables, topPercentRange, type PreflopTables } from './engine/preflopEquity.ts';

let tables: PreflopTables | null = null;
let loading: Promise<PreflopTables> | null = null;

export function getTables(): Promise<PreflopTables> {
  if (tables) return Promise.resolve(tables);
  loading ??= import('./data/preflop-equity.json').then((m) => (tables = buildTables(m.default.data)));
  return loading;
}

const cache = new Map<number, Float32Array>();
export function topPercent(pct: number): Float32Array {
  if (!tables) return new Float32Array(169);
  let r = cache.get(pct);
  if (!r) { r = topPercentRange(tables, pct); cache.set(pct, r); }
  return r;
}
