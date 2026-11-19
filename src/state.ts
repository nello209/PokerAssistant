// Stato dell'app, salvato in localStorage.
import { useEffect, useState } from 'preact/hooks';
import type { ProfileId } from './engine/openRanges.ts';
import { generateStructure, type AnteMode } from './engine/structure.ts';

export interface Level { sb: number; bb: number; ante: number; min: number; extra?: boolean }
export type AnteType = AnteMode;

export interface GenSettings { hours: number; levelMin: number }

export interface Config {
  /** giocatori ancora seduti al tavolo (decide le posizioni) */
  players: number;
  /** partecipanti al torneo (decide la struttura dei bui) */
  entrants: number;
  startingStack: number;
  levels: Level[];
  levelIndex: number;
  myStack: number;
  /** stack degli avversari (facoltativi), per stack effettivo e ICM */
  oppStacks: number[];
  anteType: AnteType;
  structureId: string;
  gen: GenSettings;
}

export type Unit = 'bb' | 'chips';

export interface Note { id: string; name: string; profile: string; entries: { t: number; text: string }[] }

export interface TimerState { running: boolean; startedAt: number; elapsedBefore: number; followShared?: boolean }

export interface Settings { wakeLock: boolean; discreet: boolean; timerDrivesLevel: boolean; seenSetup: boolean; unit: Unit }

export interface AppState {
  v: 1;
  config: Config;
  profile: ProfileId;
  mySeat: string;
  overrides: Record<string, string>;
  notes: Note[];
  timer: TimerState;
  settings: Settings;
  prizes: number[];
}

const KEY = 'tavolo-state-v1';

export function defaultState(): AppState {
  const entrants = 8, stack = 10000;
  const gen = { hours: 3, levelMin: 0 };
  const g = generateStructure({ entrants, startingStack: stack, hours: gen.hours, levelMin: gen.levelMin, ante: 'none' });
  return {
    v: 1,
    config: {
      players: entrants,
      entrants,
      startingStack: stack,
      levels: g.levels,
      levelIndex: 0,
      myStack: stack,
      oppStacks: [],
      anteType: 'none',
      structureId: 'generata',
      gen,
    },
    profile: 'prudente',
    mySeat: '',
    overrides: {},
    notes: [],
    timer: { running: false, startedAt: 0, elapsedBefore: 0 },
    settings: { wakeLock: true, discreet: false, timerDrivesLevel: true, seenSetup: false, unit: 'bb' },
    prizes: [50, 30, 20],
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const d = defaultState();
      const config = { ...d.config, ...parsed.config };
      if (!parsed.config?.entrants) config.entrants = config.players;
      return { ...d, ...parsed, config, settings: { ...d.settings, ...parsed.settings }, timer: { ...d.timer, ...parsed.timer } };
    }
  } catch { /* storage non disponibile: si riparte dai default */ }
  return defaultState();
}

let state: AppState = load();
const subs = new Set<() => void>();

export function getState() { return state; }

export function setState(fn: (s: AppState) => AppState | void) {
  const draft = structuredClone(state);
  const next = fn(draft) ?? draft;
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignora */ }
  subs.forEach((f) => f());
}

export function replaceState(s: AppState) { setState(() => s); }

export function useAppState(): AppState {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((x) => x + 1);
    subs.add(f);
    return () => { subs.delete(f); };
  }, []);
  return state;
}

// ---- Derivati

export function currentLevel(s: AppState): Level {
  const L = s.config.levels;
  return L[Math.min(Math.max(s.config.levelIndex, 0), L.length - 1)] ?? { sb: 50, bb: 100, ante: 0, min: 20 };
}

export interface Derived {
  level: Level;
  myBB: number;
  effBB: number;
  effStack: number;
  antePerPlayerBB: number;
  bbAnteBB: number;
  anteTotal: number;
  m: number;
}

export function derive(s: AppState): Derived {
  const level = currentLevel(s);
  const c = s.config;
  const bb = level.bb || 1;
  const opps = c.oppStacks.filter((x) => x > 0);
  const effStack = opps.length ? Math.min(c.myStack, Math.max(...opps)) : c.myStack;
  const antePerPlayerBB = c.anteType === 'testa' ? level.ante / bb : 0;
  const bbAnteBB = c.anteType === 'bb' ? level.ante / bb : 0;
  const anteTotal = c.anteType === 'testa' ? level.ante * c.players : c.anteType === 'bb' ? level.ante : 0;
  return {
    level, myBB: c.myStack / bb, effBB: effStack / bb, effStack,
    antePerPlayerBB, bbAnteBB, anteTotal,
    m: c.myStack / (level.sb + level.bb + anteTotal),
  };
}

// ---- Timer

export function timerElapsed(t: TimerState, now = Date.now()) {
  return t.elapsedBefore + (t.running ? now - t.startedAt : 0);
}

/** Livello corrente e ms rimanenti dati i livelli e il tempo trascorso. */
export function timerPosition(levels: Level[], elapsedMs: number) {
  let acc = 0;
  for (let i = 0; i < levels.length; i++) {
    const dur = levels[i].min * 60000;
    if (elapsedMs < acc + dur) return { index: i, remaining: acc + dur - elapsedMs, levelStart: acc };
    acc += dur;
  }
  return { index: levels.length - 1, remaining: 0, levelStart: acc };
}

export const fmtNum = (n: number, d = 1) => (Number.isFinite(n) ? n.toLocaleString('it-IT', { maximumFractionDigits: d }) : '—');
export const fmtPct = (p: number, d = 1) => (Number.isFinite(p) ? (p * 100).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d }) + '%' : '—');
export const fmtChips = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString('it-IT') : '—');

/** Importo in fiches mostrato nell'unità scelta (BB o fiches). */
export const fmtAmount = (chips: number, bb: number, unit: Unit) =>
  unit === 'bb' ? `${fmtNum(chips / (bb || 1))} BB` : `${fmtChips(chips)} fiches`;

/** Ante del livello che conta davvero (0 se il torneo è senza ante). */
export const levelAnte = (s: AppState, l: Level) => (s.config.anteType === 'none' ? 0 : l.ante);
