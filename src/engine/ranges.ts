// Matrice 13x13 delle mani iniziali. Indice = riga*13 + colonna, ranghi in ordine A,K,Q,…,2.
// Diagonale = coppie, sopra = suited, sotto = offsuit (come nel foglio Excel).
import { type Card, makeCard } from './cards.ts';

export const GRID_RANKS = 'AKQJT98765432';
export type Range = Float32Array; // 169 pesi 0..1

/** rango "evaluator" (0=2 … 12=A) dalla posizione nella griglia */
export const gridToRank = (g: number) => 12 - g;

export function handName(idx: number): string {
  const r = Math.floor(idx / 13), c = idx % 13;
  if (r === c) return GRID_RANKS[r] + GRID_RANKS[c];
  if (c > r) return GRID_RANKS[r] + GRID_RANKS[c] + 's';
  return GRID_RANKS[c] + GRID_RANKS[r] + 'o';
}

export function handIndex(name: string): number {
  const a = GRID_RANKS.indexOf(name[0].toUpperCase());
  const b = GRID_RANKS.indexOf(name[1].toUpperCase());
  if (a < 0 || b < 0) throw new Error('Mano non valida: ' + name);
  if (a === b) return a * 13 + a;
  const hiR = Math.min(a, b), loR = Math.max(a, b);
  const s = (name[2] || '').toLowerCase();
  if (s === 's') return hiR * 13 + loR;
  if (s === 'o') return loR * 13 + hiR;
  throw new Error('Specifica s o o: ' + name);
}

export const isPair = (i: number) => Math.floor(i / 13) === i % 13;
export const isSuited = (i: number) => i % 13 > Math.floor(i / 13);
export const comboCount = (i: number) => (isPair(i) ? 6 : isSuited(i) ? 4 : 12);
export const TOTAL_COMBOS = 1326;

/** Tutte le combinazioni concrete di carte per una cella della matrice. */
export function combosOf(idx: number): [Card, Card][] {
  const r = Math.floor(idx / 13), c = idx % 13;
  const out: [Card, Card][] = [];
  if (r === c) {
    const rk = gridToRank(r);
    for (let s1 = 0; s1 < 4; s1++) for (let s2 = s1 + 1; s2 < 4; s2++) out.push([makeCard(rk, s1), makeCard(rk, s2)]);
  } else if (c > r) {
    const h = gridToRank(r), l = gridToRank(c);
    for (let s = 0; s < 4; s++) out.push([makeCard(h, s), makeCard(l, s)]);
  } else {
    const h = gridToRank(c), l = gridToRank(r);
    for (let s1 = 0; s1 < 4; s1++) for (let s2 = 0; s2 < 4; s2++) if (s1 !== s2) out.push([makeCard(h, s1), makeCard(l, s2)]);
  }
  return out;
}

/** Cella della matrice per due carte concrete. */
export function classOfCards(a: Card, b: Card): number {
  const ra = a >> 2, rb = b >> 2;
  const ga = 12 - ra, gb = 12 - rb;
  if (ra === rb) return ga * 13 + ga;
  const hiG = Math.min(ga, gb), loG = Math.max(ga, gb);
  return (a & 3) === (b & 3) ? hiG * 13 + loG : loG * 13 + hiG;
}

function expandToken(tok: string): number[] {
  const t = tok.trim();
  if (!t) return [];
  const R = GRID_RANKS;
  // Coppie: 77, 77+, 77-44
  let m = /^([AKQJT2-9])\1(\+)?$/i.exec(t);
  if (m) {
    const r = R.indexOf(t[0].toUpperCase());
    const out: number[] = [];
    for (let k = m[2] ? 0 : r; k <= r; k++) out.push(k * 13 + k);
    return out;
  }
  m = /^([AKQJT2-9])\1-([AKQJT2-9])\2$/i.exec(t);
  if (m) {
    const a = R.indexOf(m[1].toUpperCase()), b = R.indexOf(m[2].toUpperCase());
    const out: number[] = [];
    for (let k = Math.min(a, b); k <= Math.max(a, b); k++) out.push(k * 13 + k);
    return out;
  }
  // Non coppie: K9s, K9s+, A5s-A2s
  m = /^([AKQJT2-9])([AKQJT2-9])([so])(\+)?$/i.exec(t);
  if (m) {
    const h = R.indexOf(m[1].toUpperCase()), l = R.indexOf(m[2].toUpperCase());
    const s = m[3].toLowerCase();
    if (h >= l) throw new Error('Notazione non valida: ' + t);
    const out: number[] = [];
    const from = m[4] ? h + 1 : l;
    for (let k = from; k <= l; k++) out.push(s === 's' ? h * 13 + k : k * 13 + h);
    return out;
  }
  m = /^([AKQJT2-9])([AKQJT2-9])([so])-([AKQJT2-9])([AKQJT2-9])([so])$/i.exec(t);
  if (m && m[1].toUpperCase() === m[4].toUpperCase() && m[3] === m[6]) {
    const h = R.indexOf(m[1].toUpperCase());
    const a = R.indexOf(m[2].toUpperCase()), b = R.indexOf(m[5].toUpperCase());
    const out: number[] = [];
    for (let k = Math.min(a, b); k <= Math.max(a, b); k++) out.push(m[3].toLowerCase() === 's' ? h * 13 + k : k * 13 + h);
    return out;
  }
  // Mano senza s/o (es. "AK") = suited + offsuit
  m = /^([AKQJT2-9])([AKQJT2-9])(\+)?$/i.exec(t);
  if (m && m[1] !== m[2]) return [...expandToken(t.slice(0, 2) + 's' + (m[3] || '')), ...expandToken(t.slice(0, 2) + 'o' + (m[3] || ''))];
  throw new Error('Notazione non riconosciuta: ' + t);
}

/** "77+; ATs+; AJo+" → Range */
export function parseRange(s: string): Range {
  const r = new Float32Array(169);
  for (const tok of s.split(/[;,]/)) for (const i of expandToken(tok)) r[i] = 1;
  return r;
}

export function rangeCombos(r: Range): number {
  let n = 0;
  for (let i = 0; i < 169; i++) n += r[i] * comboCount(i);
  return n;
}

export const rangePercent = (r: Range) => (100 * rangeCombos(r)) / TOTAL_COMBOS;

/** Range → notazione compatta (per esportare/mostrare). */
export function rangeToString(r: Range): string {
  const R = GRID_RANKS, parts: string[] = [];
  const on = (i: number) => r[i] >= 0.5;
  // coppie
  let k = 0;
  while (k < 13) {
    if (!on(k * 13 + k)) { k++; continue; }
    let e = k;
    while (e + 1 < 13 && on((e + 1) * 13 + e + 1)) e++;
    if (k === 0) parts.push(R[e] + R[e] + (e > 0 ? '+' : ''));
    else if (e === k) parts.push(R[k] + R[k]);
    else parts.push(R[k] + R[k] + '-' + R[e] + R[e]);
    k = e + 1;
  }
  for (const suited of [true, false]) {
    for (let h = 0; h < 13; h++) {
      const idx = (l: number) => (suited ? h * 13 + l : l * 13 + h);
      let l = h + 1;
      while (l < 13) {
        if (!on(idx(l))) { l++; continue; }
        let e = l;
        while (e + 1 < 13 && on(idx(e + 1))) e++;
        const sfx = suited ? 's' : 'o';
        if (l === h + 1 && e > l) parts.push(R[h] + R[e] + sfx + '+');
        else if (e === l) parts.push(R[h] + R[l] + sfx);
        else parts.push(R[h] + R[l] + sfx + '-' + R[h] + R[e] + sfx);
        l = e + 1;
      }
    }
  }
  return parts.join('; ');
}
