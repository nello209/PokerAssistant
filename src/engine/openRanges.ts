// Range di apertura per profilo, fascia di stack e posto, a partire da src/data/ranges.json.
import rangesData from '../data/ranges.json';
import { parseRange, type Range } from './ranges.ts';
import type { Seat } from './positions.ts';

export type ProfileId = keyof typeof rangesData.profili;
export type BandId = 'deep' | 'medio' | 'corto' | 'push';

export interface Band { id: BandId; nome: string; min: number; descrizione: string; approssimato: boolean; rimuovi?: { dietroMin: number; mani: string }[] }
export const BANDS = rangesData.fasce as Band[];

export function bandFor(bb: number): Band {
  for (const b of BANDS) if (bb >= b.min) return b;
  return BANDS[BANDS.length - 1];
}

export const PROFILES = rangesData.profili;

/** Range "di libreria" (senza modifiche dell'utente). Null se il posto non ha un range di apertura. */
export function baseOpenRange(profile: ProfileId, band: BandId, seat: Seat): Range | null {
  if (seat.key === 'bb') return null;
  if (seat.key === 'hu-sb' || seat.key === 'hu-bb') {
    return parseRange(rangesData.headsUp[seat.key]);
  }
  const src = (PROFILES[profile].range as Record<string, string>)[seat.key];
  if (!src) return null;
  const r = parseRange(src);
  const b = BANDS.find((x) => x.id === band);
  if (b?.rimuovi) for (const rule of b.rimuovi) {
    if (seat.behind >= rule.dietroMin) {
      const rm = parseRange(rule.mani);
      for (let i = 0; i < 169; i++) if (rm[i]) r[i] = 0;
    }
  }
  return r;
}

export const overrideKey = (profile: string, band: string, seatKey: string) => `${profile}|${band}|${seatKey}`;

export function openRange(profile: ProfileId, band: BandId, seat: Seat, overrides: Record<string, string>): { range: Range | null; edited: boolean } {
  const ov = overrides[overrideKey(profile, band, seat.key)];
  if (ov !== undefined) return { range: parseRange(ov), edited: true };
  return { range: baseOpenRange(profile, band, seat), edited: false };
}
