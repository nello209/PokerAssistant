import { useEffect, useState } from 'preact/hooks';
import { useAppState, derive, fmtNum } from '../state.ts';
import { seatsFor } from '../engine/positions.ts';
import { calc } from '../worker/client.ts';
import type { PushFoldResult } from '../engine/pushfold.ts';
import { RangeGrid } from '../components/RangeGrid.tsx';
import { Seg, NumField, Approx } from '../components/ui.tsx';
import { handName, comboCount } from '../engine/ranges.ts';
import guida from '../data/guida.json';
import { InfoInline } from '../components/Info.tsx';

export function PushFold() {
  const s = useAppState();
  const d = derive(s);
  const N = s.config.players;
  const seats = seatsFor(N);
  const shoverSeats = seats.filter((x) => x.behind > 0);
  const [mode, setMode] = useState<'shove' | 'call'>('shove');
  const [stack, setStack] = useState(() => Math.max(1, Math.round(d.effBB * 2) / 2));
  const [followMine, setFollowMine] = useState(true);
  const [shoverKey, setShoverKey] = useState(() => (shoverSeats.find((x) => x.key === s.mySeat) ?? shoverSeats[shoverSeats.length - 1]).key);
  const [callerKey, setCallerKey] = useState('bb');
  const [res, setRes] = useState<PushFoldResult | null>(null);
  const [sel, setSel] = useState<number | null>(null);

  useEffect(() => { if (followMine) setStack(Math.min(30, Math.max(1, Math.round(d.effBB * 2) / 2))); }, [d.effBB, followMine]);

  const shover = shoverSeats.find((x) => x.key === shoverKey) ?? shoverSeats[shoverSeats.length - 1];
  const callers = seats.filter((x) => x.behind < shover.behind);
  const caller = callers.find((x) => x.key === callerKey || (x.key === 'hu-bb' && callerKey === 'bb')) ?? callers[callers.length - 1];

  useEffect(() => {
    let alive = true;
    setRes(null);
    calc.pushFold({ players: N, behind: shover.behind, stackBB: stack, antePerPlayer: d.antePerPlayerBB, bbAnte: d.bbAnteBB })
      .then((r) => { if (alive) setRes(r); }).catch(() => {});
    return () => { alive = false; };
  }, [N, shover.behind, stack, d.antePerPlayerBB, d.bbAnteBB]);

  const callerIdx = callers.indexOf(caller);
  const callRange = res?.calls[callerIdx];
  const values = mode === 'shove' ? res?.push ?? null : callRange?.range ?? null;
  const isHU = N === 2;

  return (
    <div>
      <div class="mb"><Seg value={mode} onChange={(v) => { setMode(v); setSel(null); }} options={[{ v: 'shove', l: 'Shove (first-in)' }, { v: 'call', l: 'Call vs shove' }]} /></div>
      <div class="mb"><InfoInline key={mode} info={mode === 'shove' ? 'pushFold' : 'callShove'} /></div>

      <div class="card">
        <div class="row">
          <div class="grow"><NumField label="Stack effettivo (BB)" value={stack} step={0.5} min={1} max={30} onChange={(v) => { setFollowMine(false); setStack(v); }} /></div>
          <button type="button" class={'btn sm' + (followMine ? ' primary' : '')} style={{ marginTop: '8px' }} onClick={() => setFollowMine(true)}>il mio</button>
        </div>
        {stack > 15 && <div class="small warn mb">Con più di ~15 BB andare all-in per primi di solito non è la scelta migliore: meglio un normale open raise (scheda Preflop). Qui i range sono solo indicativi.</div>}
        <div class="tiny muted">{N} giocatori · ante {d.antePerPlayerBB ? fmtNum(d.antePerPlayerBB, 2) + ' BB a testa' : d.bbAnteBB ? fmtNum(d.bbAnteBB, 2) + ' BB (BB ante)' : 'assente'} · piatto iniziale {fmtNum(res?.potBB ?? 1.5, 2)} BB</div>

        <div class="slot-label mt">{mode === 'shove' ? 'Shove da' : 'Chi fa shove'}</div>
        <div class="chips">
          {shoverSeats.map((x) => <button type="button" key={x.key} class={'chip' + (x.key === shover.key ? ' on' : '')} onClick={() => { setShoverKey(x.key); setSel(null); }}>{x.name}</button>)}
        </div>
        {mode === 'call' && (
          <>
            <div class="slot-label mt">Io sono</div>
            <div class="chips">{callers.map((x) => <button type="button" key={x.key} class={'chip' + (x === caller ? ' on' : '')} onClick={() => { setCallerKey(x.key); setSel(null); }}>{x.name}</button>)}</div>
          </>
        )}
      </div>

      <div class="card">
        <div class="row mb">
          <b class="grow">{mode === 'shove' ? `Shove da ${shover.name}` : `${caller.name}: call contro shove di ${shover.name}`}</b>
          <div class="bigpct" style={{ fontSize: '26px' }}>{res ? fmtNum(mode === 'shove' ? res.pushPct : callRange?.pct ?? 0) + '%' : '…'}</div>
        </div>
        {values ? <RangeGrid values={mode === 'shove' ? values : null} second={mode === 'call' ? values : null} onCell={setSel} selected={sel} /> : <div class="muted center" style={{ padding: '60px 0' }}>Calcolo equilibrio…</div>}
        <div class="legend">
          {mode === 'shove' ? <><span><i style={{ background: 'var(--gold)' }} />shove</span><span><i style={{ background: 'linear-gradient(135deg,var(--gold) 50%,var(--bg3) 50%)' }} />misto</span></> : <span><i style={{ background: 'var(--blue)' }} />call</span>}
          <span><i style={{ background: 'var(--bg3)' }} />fold</span>
        </div>
        {sel !== null && values && (
          <div class="small mt"><b>{handName(sel)}</b> ({comboCount(sel)} combo): {values[sel] >= 0.5 ? <span class="good">{mode === 'shove' ? 'SHOVE' : 'CALL'}</span> : <span class="bad">FOLD</span>}
            {mode === 'shove' && res && <span class="muted"> · EV {fmtNum(res.evPush[sel], 2)} BB rispetto al fold</span>}</div>
        )}
        {mode === 'shove' && res && res.calls.length > 0 && (
          <div class="tiny muted mt">Chi è dietro chiama con: {res.calls.map((c) => `${c.seat} ${fmtNum(c.pct)}%`).join(' · ')}</div>
        )}
        {mode === 'call' && res && <div class="tiny muted mt">Range di shove di {shover.name} in equilibrio: {fmtNum(res.pushPct)}%.</div>}
        {isHU ? (
          <div class="tiny muted mt">Equilibrio di Nash heads-up (SB/BTN push, BB call), chip-EV, calcolato dall'app.</div>
        ) : (
          <Approx>Approssimazione: equilibrio calcolato considerando un solo chiamante (niente overcall), decisioni indipendenti, chip-EV senza ICM. Vicino ai premi stringi i call.</Approx>
        )}
      </div>

      <details class="card">
        <summary>Come ragionare da corto</summary>
        {guida.pushFold.map((g) => <p key={g.t} class="small"><b>{g.t}</b> — {g.d}</p>)}
      </details>
    </div>
  );
}
