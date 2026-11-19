import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { PCard, CardPicker, CardText, Seg, Modal, NumField } from '../components/ui.tsx';
import { RangeGrid } from '../components/RangeGrid.tsx';
import { bestFive, describe, CATEGORY_NAMES } from '../engine/evaluator.ts';
import { countOuts } from '../engine/outs.ts';
import type { EquityResult, Opponent } from '../engine/equity.ts';
import { calc } from '../worker/client.ts';
import { useAppState, derive, fmtPct, fmtNum, fmtChips } from '../state.ts';
import { requiredEquityFromPot, callEV, ruleOf4, ruleOf2 } from '../engine/odds.ts';
import { seatsFor } from '../engine/positions.ts';
import { bandFor, openRange } from '../engine/openRanges.ts';
import { parseRange, rangePercent, rangeToString, type Range } from '../engine/ranges.ts';
import { getTables, topPercent } from '../tables.ts';
import guida from '../data/guida.json';
import { SecHead } from '../components/Info.tsx';

type C = number | null;
type OppKind = 'random' | 'hand' | 'range';
interface OppState { kind: OppKind; cards: [C, C]; src: 'top' | 'seat' | 'custom'; pct: number; seatKey: string; custom: string }
type Slot = { who: 'hero'; i: number } | { who: 'board'; i: number } | { who: 'opp'; o: number; i: number };

const newOpp = (): OppState => ({ kind: 'random', cards: [null, null], src: 'top', pct: 25, seatKey: '', custom: '' });

export function Hand() {
  const s = useAppState();
  const d = derive(s);
  const [hero, setHero] = useState<[C, C]>([null, null]);
  const [board, setBoard] = useState<C[]>([null, null, null, null, null]);
  const [opps, setOpps] = useState<OppState[]>([newOpp()]);
  const [active, setActive] = useState<Slot | null>({ who: 'hero', i: 0 });
  const [eq, setEq] = useState<EquityResult | null>(null);
  const [eqErr, setEqErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rangeEdit, setRangeEdit] = useState<number | null>(null);
  const [showRank, setShowRank] = useState(false);
  const [tablesReady, setTablesReady] = useState(false);
  useEffect(() => { getTables().then(() => setTablesReady(true)); }, []);

  const used = useMemo(() => {
    const u = new Set<number>();
    hero.forEach((c) => c !== null && u.add(c));
    board.forEach((c) => c !== null && u.add(c));
    opps.forEach((o) => o.kind === 'hand' && o.cards.forEach((c) => c !== null && u.add(c)));
    return u;
  }, [hero, board, opps]);

  const heroCards = hero.filter((c): c is number => c !== null);
  const boardCards = board.filter((c): c is number => c !== null);

  // ---- slot handling
  const isActive = (sl: Slot) => active !== null && JSON.stringify(active) === JSON.stringify(sl);
  const slotValue = (sl: Slot): C => sl.who === 'hero' ? hero[sl.i] : sl.who === 'board' ? board[sl.i] : opps[sl.o].cards[sl.i];
  const setSlot = (sl: Slot, v: C) => {
    if (sl.who === 'hero') setHero((h) => { const n = [...h] as [C, C]; n[sl.i] = v; return n; });
    else if (sl.who === 'board') setBoard((b) => { const n = [...b]; n[sl.i] = v; return n; });
    else setOpps((os) => os.map((o, k) => k === sl.o ? { ...o, cards: (sl.i === 0 ? [v, o.cards[1]] : [o.cards[0], v]) as [C, C] } : o));
  };
  const nextSlot = (sl: Slot): Slot | null => {
    if (sl.who === 'hero') return sl.i === 0 ? { who: 'hero', i: 1 } : board[0] === null ? { who: 'board', i: 0 } : null;
    if (sl.who === 'board') return sl.i < 2 ? { who: 'board', i: sl.i + 1 } : null;
    return sl.i === 0 ? { ...sl, i: 1 } : null;
  };
  const tapSlot = (sl: Slot) => {
    if (slotValue(sl) !== null && isActive(sl)) { setSlot(sl, null); return; }
    if (slotValue(sl) !== null) { setSlot(sl, null); }
    setActive(sl);
  };
  const pick = (c: number) => {
    let sl = active;
    if (!sl) {
      // primo slot libero
      if (hero[0] === null) sl = { who: 'hero', i: 0 }; else if (hero[1] === null) sl = { who: 'hero', i: 1 };
      else { const bi = board.findIndex((x) => x === null); if (bi >= 0) sl = { who: 'board', i: bi }; }
    }
    if (!sl) return;
    setSlot(sl, c);
    setActive(nextSlot(sl));
  };
  const clearAll = () => { setHero([null, null]); setBoard([null, null, null, null, null]); setOpps((os) => os.map((o) => ({ ...o, cards: [null, null] }))); setActive({ who: 'hero', i: 0 }); setEq(null); };
  const clearBoard = () => { setBoard([null, null, null, null, null]); setActive({ who: 'board', i: 0 }); };

  // ---- avversari → Opponent
  const seats = seatsFor(s.config.players).filter((x) => x.key !== 'bb');
  const oppRange = (o: OppState): Range | null => {
    if (o.src === 'top') return tablesReady ? topPercent(o.pct) : null;
    if (o.src === 'custom') return o.custom ? parseRange(o.custom) : null;
    const seat = seats.find((x) => x.key === o.seatKey) ?? seats[0];
    const band = bandFor(d.effBB).id;
    return openRange(s.profile, band === 'push' ? 'corto' : band, seat, s.overrides).range;
  };
  const opponents: Opponent[] | null = useMemo(() => {
    const out: Opponent[] = [];
    for (const o of opps) {
      if (o.kind === 'random') out.push({ kind: 'random' });
      else if (o.kind === 'hand') { if (o.cards[0] === null || o.cards[1] === null) return null; out.push({ kind: 'hand', cards: [o.cards[0], o.cards[1]] }); }
      else { const r = oppRange(o); if (!r || rangePercent(r) === 0) return null; out.push({ kind: 'range', range: r }); }
    }
    return out;
  }, [opps, tablesReady, s.profile, s.overrides, d.effBB, s.config.players]);

  // ---- equity (debounce)
  const boardOk = boardCards.length === 0 || boardCards.length >= 3;
  const tmr = useRef<number | undefined>(undefined);
  useEffect(() => {
    clearTimeout(tmr.current);
    setEqErr(null);
    if (heroCards.length !== 2 || !opponents || !boardOk) { setEq(null); return; }
    tmr.current = window.setTimeout(() => {
      setBusy(true);
      calc.equity(heroCards, opponents, boardCards, (r) => setEq(r))
        .then((r) => { setEq(r); setBusy(false); })
        .catch((e: Error) => { if (e.message !== 'annullato') { setEqErr(e.message); setBusy(false); } });
    }, 200);
  }, [hero, board, opponents]);

  // ---- cosa ho / outs
  const made = heroCards.length === 2 ? bestFive([...heroCards, ...boardCards]) : null;
  const villainHand = opps.length === 1 && opps[0].kind === 'hand' && opps[0].cards[0] !== null && opps[0].cards[1] !== null ? [opps[0].cards[0]!, opps[0].cards[1]!] : undefined;
  const outs = heroCards.length === 2 && (boardCards.length === 3 || boardCards.length === 4) ? countOuts(heroCards, boardCards, villainHand) : null;

  return (
    <div>
      {/* Carte */}
      <div class="card">
        <div class="handrow">
          <div>
            <div class="slot-label">Mano</div>
            <div class="slots">
              {[0, 1].map((i) => <PCard key={i} c={hero[i]} active={isActive({ who: 'hero', i })} hl={made ? made.five.includes(hero[i]!) && boardCards.length >= 3 : false} onClick={() => tapSlot({ who: 'hero', i })} />)}
            </div>
          </div>
          <div class="grow">
            <div class="slot-label">Board</div>
            <div class="slots">
              {[0, 1, 2, 3, 4].map((i) => <PCard key={i} c={board[i]} active={isActive({ who: 'board', i })} hl={made ? made.five.includes(board[i]!) : false} label={i < 3 ? 'F' : i === 3 ? 'T' : 'R'} onClick={() => tapSlot({ who: 'board', i })} />)}
            </div>
          </div>
        </div>
        {opps.map((o, k) => o.kind === 'hand' && (
          <div key={k} class="mt">
            <div class="slot-label">Avversario {k + 1}</div>
            <div class="slots">{[0, 1].map((i) => <PCard key={i} c={o.cards[i]} active={isActive({ who: 'opp', o: k, i })} onClick={() => tapSlot({ who: 'opp', o: k, i })} />)}</div>
          </div>
        ))}
        <CardPicker used={used} onPick={pick} />
        <div class="row mt">
          <button type="button" class="btn sm grow" onClick={clearAll}>Nuova mano</button>
          <button type="button" class="btn sm grow" onClick={clearBoard}>Pulisci board</button>
        </div>
        <div class="tiny muted mt">Tocca una casella (Mano o Board), poi la carta nella griglia: le caselle si riempiono in ordine. Tocca una carta già inserita per toglierla. Board: F = flop (3 carte), T = turn, R = river.</div>
      </div>

      {/* Cosa ho */}
      {made && (
        <div class="card">
          <SecHead label="Cosa ho" info="cosaHo" />
          <div class="row">
            <div class="grow" style={{ fontSize: '20px', fontWeight: 700 }}>{heroCards.length + boardCards.length >= 5 ? describe(made.score) : describePre(heroCards)}</div>
            <button type="button" class="btn sm ghost" onClick={() => setShowRank(true)}>Classifica</button>
          </div>
        </div>
      )}

      {/* Outs */}
      {outs && (
        <div class="card">
          <SecHead label={`Outs (${outs.street === 'flop' ? 'dal flop' : 'dal turn'})`} info="outs" />
          <div class="row">
            <div class="grow">
              <div style={{ fontSize: '28px', fontWeight: 800 }}>{outs.clean} <span class="small muted">puliti</span></div>
              {outs.strong > outs.clean && <div class="small warn">+{outs.strong - outs.clean} sporchi</div>}
              {outs.weak > 0 && <div class="small muted">+{outs.weak} che migliorano poco (coppia, doppia, tris)</div>}
            </div>
            <div class="kv" style={{ minWidth: '170px' }}>
              <span>{outs.street === 'flop' ? 'Turn' : 'River'}</span><b>{fmtPct(outs.pNext)}</b>
              {outs.pBoth !== null && <><span>Entro il river</span><b>{fmtPct(outs.pBoth)}</b></>}
              <span>Regola rapida</span><span>{outs.street === 'flop' ? ruleOf4(outs.clean) : ruleOf2(outs.clean)}%</span>
            </div>
          </div>
          {outs.outs.filter((o) => o.strong).length > 0 && (
            <div class="small mt" style={{ lineHeight: 1.8 }}>
              {groupOuts(outs.outs.filter((o) => o.strong)).map(([label, list]) => (
                <div key={label}><span class="muted">{label}:</span> {list.map((o) => <span key={o.card} style={{ marginRight: '6px', opacity: o.dirty ? 0.55 : 1 }}><CardText c={o.card} />{o.dirty ? '*' : ''}</span>)}</div>
              ))}
              {outs.strong > outs.clean && <div class="tiny muted">* sporco: {outs.outs.find((o) => o.dirty)?.note}</div>}
            </div>
          )}
          {outs.vsHand && (
            <div class="small mt">{outs.vsHand.ahead ? <span class="good">Sei avanti contro la mano dell'avversario.</span> : <>Contro la mano dell'avversario: <b>{outs.vsHand.outs.length} carte</b> ti mettono avanti.</>}</div>
          )}
          <div class="tiny muted mt">Outs puliti = carte che ti danno scala o meglio senza appaiare il board né completare un colore possibile. Ipotesi: 47 carte ignote al flop, 46 al turn.</div>
        </div>
      )}

      {/* Avversari ed equity */}
      <div class="card">
        <SecHead label="Avversari" info="avversari" right={<button type="button" class="btn sm" disabled={opps.length >= 9} onClick={() => setOpps([...opps, newOpp()])}>+ avv.</button>} />
        {opps.map((o, k) => (
          <div key={k} class="mb" style={{ borderTop: k ? '1px solid var(--line)' : 0, paddingTop: k ? '10px' : 0 }}>
            <div class="row mb">
              <b class="small" style={{ width: '24px' }}>{k + 1}</b>
              <div class="grow"><Seg value={o.kind} onChange={(v: OppKind) => { setOpps(opps.map((x, j) => j === k ? { ...x, kind: v, cards: [null, null] } : x)); if (v === 'hand') setActive({ who: 'opp', o: k, i: 0 }); }} options={[{ v: 'random', l: 'Casuale' }, { v: 'range', l: 'Range' }, { v: 'hand', l: 'Mano' }]} /></div>
              {opps.length > 1 && <button type="button" class="btn sm ghost danger" onClick={() => { setOpps(opps.filter((_, j) => j !== k)); setActive(null); }} aria-label="rimuovi">✕</button>}
            </div>
            {o.kind === 'range' && (
              <div>
                <Seg value={o.src} onChange={(v: OppState['src']) => setOpps(opps.map((x, j) => j === k ? { ...x, src: v, seatKey: x.seatKey || seats[0].key, custom: v === 'custom' && !x.custom ? rangeToString(oppRange(x) ?? new Float32Array(169)) : x.custom } : x))}
                  options={[{ v: 'top', l: 'Top %' }, { v: 'seat', l: 'Apertura' }, { v: 'custom', l: 'Matrice' }]} />
                {o.src === 'top' && (
                  <div class="mt"><div class="row"><span class="small muted grow">Migliori mani</span><b>{o.pct}%</b></div>
                    <input type="range" min={1} max={100} value={o.pct} onInput={(e) => { const v = +(e.target as HTMLInputElement).value; setOpps(opps.map((x, j) => j === k ? { ...x, pct: v } : x)); }} /></div>
                )}
                {o.src === 'seat' && (
                  <div class="chips mt">{seats.map((st) => <button type="button" key={st.key} class={'chip' + ((o.seatKey || seats[0].key) === st.key ? ' on' : '')} onClick={() => setOpps(opps.map((x, j) => j === k ? { ...x, seatKey: st.key } : x))}>{st.name}</button>)}</div>
                )}
                {o.src === 'custom' && (
                  <button type="button" class="btn sm mt" onClick={() => setRangeEdit(k)}>Modifica matrice ({fmtNum(o.custom ? rangePercent(parseRange(o.custom)) : 0)}%)</button>
                )}
                {o.src !== 'custom' && oppRange(o) && <div class="tiny muted mt">{fmtNum(rangePercent(oppRange(o)!))}% delle mani</div>}
              </div>
            )}
          </div>
        ))}

        <div class="mt" style={{ borderTop: '1px solid var(--line)', paddingTop: '10px' }}>
          <SecHead label="La tua equity" info="equity" />
          <EquityView eq={eq} busy={busy} err={eqErr} ready={heroCards.length === 2 && !!opponents && boardOk} n={opps.length} />
        </div>
      </div>

      <PotOdds equity={eq?.equity[0] ?? null} boardLen={boardCards.length} bb={d.level.bb} />

      {rangeEdit !== null && (
        <Modal title={`Range avversario ${rangeEdit + 1}`} onClose={() => setRangeEdit(null)}>
          <RangeEditor value={opps[rangeEdit].custom} onChange={(v) => setOpps(opps.map((x, j) => j === rangeEdit ? { ...x, custom: v } : x))} />
        </Modal>
      )}
      {showRank && <Modal title="Classifica dei punti" onClose={() => setShowRank(false)}><Ranking /></Modal>}
    </div>
  );
}

function describePre(h: number[]) {
  if ((h[0] >> 2) === (h[1] >> 2)) return describe((1 << 20) | ((h[0] >> 2) << 16));
  return 'Carta alta (preflop)';
}

function groupOuts(list: { label: string; card: number; dirty: boolean }[]): [string, typeof list][] {
  const m = new Map<string, typeof list>();
  for (const o of list) {
    const key = o.label.split(' ')[0];
    if (!m.has(key)) m.set(key, []);
    m.get(key)!.push(o);
  }
  return [...m.entries()];
}

function EquityView({ eq, busy, err, ready, n }: { eq: EquityResult | null; busy: boolean; err: string | null; ready: boolean; n: number }) {
  if (err) return <div class="bad small">{err}</div>;
  if (!ready) return <div class="small muted mt">Inserisci le tue 2 carte (e il board: 0, 3, 4 o 5 carte) per calcolare l'equity.</div>;
  if (!eq) return <div class="small muted mt">Calcolo…</div>;
  const colors = ['var(--gold)', 'var(--blue)', '#8a6fd6', '#d66fa8', '#6fd6c4', '#d6c46f', '#a8d66f', '#d6866f', '#6f8ad6', '#aaa'];
  return (
    <div>
      <div class="row">
        <div class="grow">
          <div class="bigpct">{fmtPct(eq.equity[0])}</div>
          <div class="tiny muted">vinci {fmtPct(eq.win[0])} · pareggi {fmtPct(eq.tie[0])}</div>
        </div>
        <div class="kv">
          {eq.equity.slice(1).map((e, i) => <><span key={'l' + i}>Avv. {i + 1}</span><b key={'v' + i}>{fmtPct(e)}</b></>)}
        </div>
      </div>
      <div class="bar mt">{eq.equity.map((e, i) => <div key={i} style={{ width: e * 100 + '%', background: colors[i] }} />)}</div>
      <div class="tiny muted mt">
        {eq.method === 'esatto' ? `Enumerazione esatta (${eq.samples.toLocaleString('it-IT')} casi)` : `Monte Carlo: ${eq.samples.toLocaleString('it-IT')} simulazioni, ±${fmtNum(eq.stderr * 196, 1)}% (95%)`}
        {busy && ' · calcolo in corso…'}{n > 1 && ' · contro tutti gli avversari insieme'}
      </div>
    </div>
  );
}

function PotOdds({ equity, boardLen, bb }: { equity: number | null; boardLen: number; bb: number }) {
  const [pot, setPot] = useState(0);
  const [call, setCall] = useState(0);
  const [manual, setManual] = useState<number | null>(null);
  const [allIn, setAllIn] = useState(false);
  const e = manual !== null ? manual / 100 : equity;
  const req = pot > 0 && call > 0 ? requiredEquityFromPot(pot, call) : null;
  const ev = req !== null && e !== null ? callEV(e, pot, call) : null;
  const step = Math.max(bb || 1, 1);
  return (
    <div class="card">
      <SecHead label="Pot odds: devo chiamare?" info="potOdds" />
      <div class="row">
        <div class="grow"><NumField label="Piatto (con la sua puntata)" value={pot} step={step} onChange={setPot} /></div>
        <div class="grow"><NumField label="Da chiamare" value={call} step={step} onChange={setCall} /></div>
      </div>
      <div class="row small mb wrap">
        <span class="muted">Equity:</span>
        <button type="button" class={'btn sm' + (manual === null ? ' primary' : '')} onClick={() => setManual(null)}>calcolata {equity !== null ? fmtPct(equity) : '—'}</button>
        <button type="button" class={'btn sm' + (manual !== null ? ' primary' : '')} onClick={() => { const v = prompt('Equity stimata (%)', e !== null ? String(Math.round(e * 100)) : '30'); const n = v ? parseFloat(v.replace(',', '.')) : NaN; if (Number.isFinite(n)) setManual(Math.min(100, Math.max(0, n))); }}>{manual !== null ? `manuale ${manual}%` : 'manuale'}</button>
        <label class="row small"><input type="checkbox" checked={allIn} onChange={(x) => setAllIn((x.target as HTMLInputElement).checked)} style={{ width: '22px', height: '22px' }} /> è all-in / river</label>
      </div>
      {req !== null && (
        <>
          <div class="kv mb">
            <span>Equity minima</span><b>{fmtPct(req)}</b>
            <span>Pot odds</span><span>{fmtNum((pot) / call, 2)} : 1</span>
            {e !== null && <><span>La tua equity</span><b>{fmtPct(e)}</b></>}
            {ev !== null && <><span>EV del call</span><b class={ev > 0 ? 'good' : ev < 0 ? 'bad' : ''}>{ev > 0 ? '+' : ''}{fmtChips(ev)} ({ev > 0 ? '+' : ''}{fmtNum(ev / (bb || 1), 2)} BB)</b></>}
          </div>
          {e !== null && ev !== null && (
            <div class={'verdict ' + (Math.abs(e - req) < 0.01 ? 'even' : ev > 0 ? 'call' : 'fold')}>
              {Math.abs(e - req) < 0.01 ? 'AL LIMITE' : ev > 0 ? 'CALL +EV' : 'FOLD'}
              <span class="sub">margine {e - req > 0 ? '+' : ''}{fmtNum((e - req) * 100)} punti di equity</span>
            </div>
          )}
          {!allIn && boardLen < 5 && <p class="tiny warn mt">{guida.avvertenze.impliedOdds}</p>}
          <p class="tiny muted">{guida.avvertenze.icm} Formula: da chiamare / (piatto + da chiamare). EV = equity × (piatto + call) − call.</p>
        </>
      )}
    </div>
  );
}

function RangeEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const r = parseRange(value || '');
  return (
    <div>
      <div class="row mb"><b class="grow">{fmtNum(rangePercent(r))}%</b>
        <button type="button" class="btn sm ghost" onClick={() => onChange('')}>Svuota</button>
        <button type="button" class="btn sm ghost" onClick={() => onChange('22+; A2s+; K2s+; Q2s+; J2s+; T2s+; 92s+; 82s+; 72s+; 62s+; 52s+; 42s+; 32s; A2o+; K2o+; Q2o+; J2o+; T2o+; 92o+; 82o+; 72o+; 62o+; 52o+; 42o+; 32o')}>Tutte</button>
      </div>
      <RangeGrid values={r} onCell={(i) => { const n = new Float32Array(r); n[i] = n[i] >= 0.5 ? 0 : 1; onChange(rangeToString(n)); }} />
      <label class="field mt"><span>Notazione</span>
        <input type="text" value={value} onChange={(e) => { try { parseRange((e.target as HTMLInputElement).value); onChange((e.target as HTMLInputElement).value); } catch { alert('Notazione non valida'); } }} />
      </label>
    </div>
  );
}

function Ranking() {
  const ex = ['K♠ Q♦ 9♣ 7♥ 3♠', 'J♥ J♣ 8♦ 5♠ 2♣', 'A♣ A♦ 9♥ 9♠ 4♦', '7♠ 7♥ 7♦ K♣ 2♠', '9♦ 8♣ 7♥ 6♠ 5♦', 'A♥ J♥ 8♥ 6♥ 3♥', 'Q♠ Q♥ Q♦ 4♣ 4♠', '8♣ 8♦ 8♥ 8♠ K♦', '9♠ 8♠ 7♠ 6♠ 5♠'];
  const combos = [1302540, 1098240, 123552, 54912, 10200, 5108, 3744, 624, 40];
  return (
    <table class="t">
      <thead><tr><th>Punto</th><th>Esempio</th><th>Prob. 5 carte</th></tr></thead>
      <tbody>
        {CATEGORY_NAMES.map((n, i) => ({ n, i })).reverse().map(({ n, i }) => (
          <tr key={i}><td><b>{9 - i}. {n}</b></td><td class="small">{ex[i]}</td><td class="small">{fmtNum((combos[i] / 2598960) * 100, 4)}%</td></tr>
        ))}
      </tbody>
    </table>
  );
}
