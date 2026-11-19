import { useEffect, useMemo, useState } from 'preact/hooks';
import { useAppState, setState, derive, fmtNum } from '../state.ts';
import { seatsFor } from '../engine/positions.ts';
import { BANDS, bandFor, openRange, overrideKey, PROFILES, baseOpenRange, type BandId, type ProfileId } from '../engine/openRanges.ts';
import { rangePercent, rangeCombos, rangeToString, handName, comboCount, type Range } from '../engine/ranges.ts';
import { RangeGrid } from '../components/RangeGrid.tsx';
import { Seg, Approx } from '../components/ui.tsx';
import { calc } from '../worker/client.ts';
import type { PushFoldResult } from '../engine/pushfold.ts';
import guida from '../data/guida.json';
import { SecHead, InfoInline } from '../components/Info.tsx';
import { TableSeats } from '../components/TableSeats.tsx';
import { nextHandSeat } from '../engine/positions.ts';

export function Preflop() {
  const s = useAppState();
  const d = derive(s);
  const seats = seatsFor(s.config.players);
  const seat = seats.find((x) => x.key === s.mySeat) ?? seats[0];
  const [bandSel, setBandSel] = useState<'auto' | BandId>('auto');
  const [edit, setEdit] = useState(false);
  const [sel, setSel] = useState<number | null>(null);
  const autoBand = bandFor(d.effBB);
  const band = bandSel === 'auto' ? autoBand : BANDS.find((b) => b.id === bandSel)!;
  const isHU = s.config.players === 2;
  const usePush = band.id === 'push' && seat.key !== 'bb' && seat.key !== 'hu-bb';

  const { range, edited } = useMemo(() => openRange(s.profile, band.id === 'push' ? 'corto' : band.id, seat, s.overrides), [s.profile, band.id, seat.key, s.overrides, s.config.players]);

  const [pf, setPf] = useState<PushFoldResult | null>(null);
  // se la fascia <10 è scelta a mano ma lo stack reale è più alto, si mostra un esempio a 8 BB
  const pfStack = d.effBB < 10 ? Math.max(1, Math.round(d.effBB * 2) / 2) : 8;
  useEffect(() => {
    if (!usePush) { setPf(null); return; }
    let alive = true;
    calc.pushFold({ players: s.config.players, behind: seat.behind, stackBB: pfStack, antePerPlayer: d.antePerPlayerBB, bbAnte: d.bbAnteBB })
      .then((r) => { if (alive) setPf(r); }).catch(() => {});
    return () => { alive = false; };
  }, [usePush, s.config.players, seat.behind, pfStack, d.antePerPlayerBB, d.bbAnteBB]);

  const shown: ArrayLike<number> | null = usePush ? pf?.push ?? null : range;
  const toggle = (i: number) => {
    if (!edit || usePush || !range) { setSel(i); return; }
    const r = new Float32Array(range) as Range;
    r[i] = r[i] >= 0.5 ? 0 : 1;
    setState((x) => { x.overrides[overrideKey(x.profile, band.id, seat.key)] = rangeToString(r); });
  };
  const reset = () => setState((x) => { delete x.overrides[overrideKey(x.profile, band.id, seat.key)]; });

  const pct = shown ? rangePercent(shown as Range) : 0;
  const prof = PROFILES[s.profile];

  return (
    <div>
      <SecHead label="La mia posizione" info="posizioni" />
      <TableSeats seats={seats} selected={seat.key} onPick={(k) => { setState((st) => { st.mySeat = k; }); setSel(null); }} />
      <div class="row mb">
        <div class="grow small"><b>{seat.name}</b> <span class="muted">· {isHU ? 'heads-up' : `${seat.behind} giocatori parlano dopo di te`}</span></div>
        <button type="button" class="btn sm" onClick={() => { setState((st) => { st.mySeat = nextHandSeat(seats, seat.key); }); setSel(null); }}>Mano dopo ⟳</button>
      </div>

      <SecHead label="Profondità dello stack" info="fasce" />
      <div class="mb">
        <Seg value={bandSel} onChange={(v) => { setBandSel(v); setSel(null); }} options={[
          { v: 'auto', l: 'Auto' }, { v: 'deep', l: '40+' }, { v: 'medio', l: '20–40' }, { v: 'corto', l: '10–20' }, { v: 'push', l: '<10' },
        ]} />
      </div>

      {seat.key === 'bb' ? (
        <BBInfo />
      ) : (
        <div class="card">
          <div class="row mb">
            <div class="grow">
              <b>{usePush ? 'Shove (all-in) first-in' : 'Open raise'}</b> · {seat.name}
              <div class="tiny muted">
                Calcolato per: <b>{s.config.players} giocatori</b>{!isHU && <> · {seat.behind} parlano dopo di te</>} · <b>{bandSel === 'auto' ? `${fmtNum(d.effBB)} BB → ${band.nome}` : band.nome}</b>
              </div>
            </div>
            <div class="center"><div class="bigpct" style={{ fontSize: '26px' }}>{fmtNum(pct)}%</div><div class="tiny muted">{shown ? Math.round(rangeCombos(shown as Range)) : 0} combo</div></div>
          </div>
          <div class="mb"><InfoInline info={usePush ? 'pushFold' : 'range'} /></div>

          {usePush && !pf ? <div class="muted center" style={{ padding: '40px 0' }}>Calcolo equilibrio…</div> : <RangeGrid values={shown} onCell={toggle} selected={sel} />}

          <div class="legend"><span><i style={{ background: 'var(--gold)' }} />{usePush ? 'shove' : 'raise'}</span><span><i style={{ background: 'var(--bg3)' }} />fold</span>{usePush && <span><i style={{ background: 'linear-gradient(135deg,var(--gold) 50%,var(--bg3) 50%)' }} />misto</span>}</div>

          {sel !== null && shown && (
            <div class="mt small">
              <b>{handName(sel)}</b> ({comboCount(sel)} combo): {shown[sel] >= 0.85 ? <span class="good">{usePush ? 'SHOVE' : 'RAISE'}</span> : shown[sel] >= 0.15 ? <span class="warn">misto ({fmtNum(shown[sel] * 100, 0)}%)</span> : <span class="bad">FOLD</span>}
              {usePush && pf && <span class="muted"> · EV shove {fmtNum(pf.evPush[sel], 2)} BB</span>}
            </div>
          )}

          {!usePush && (
            <div class="row mt wrap">
              <div class="grow"><Seg value={s.profile} onChange={(v: ProfileId) => setState((x) => { x.profile = v; })} options={[{ v: 'prudente', l: 'Prudente' }, { v: 'standard', l: 'Standard' }]} /></div>
              <button type="button" class={'btn sm' + (edit ? ' primary' : '')} onClick={() => setEdit(!edit)}>{edit ? 'Fine modifica' : 'Modifica'}</button>
              {edited && <button type="button" class="btn sm ghost" onClick={reset}>Ripristina</button>}
            </div>
          )}
          {!usePush && <div class="mt"><InfoInline info="profili" /></div>}
          {edit && !usePush && <div class="tiny warn mt">Tocca le celle per aggiungere o togliere mani. Le modifiche valgono per questo profilo, fascia e posizione.</div>}

          <div class="tiny muted mt">
            {usePush
              ? `Nash chip-EV con ${fmtNum(pfStack)} BB${d.effBB >= 10 ? ' (esempio: il tuo stack è più alto; stack esatto nella scheda Push/Fold)' : ''}, ${s.config.players} giocatori${d.antePerPlayerBB || d.bbAnteBB ? ', con ante' : ', senza ante'}. Pot iniziale ${fmtNum(pf?.potBB ?? 0, 2)} BB.`
              : isHU ? 'Heads-up: range del bottone (raise o limp).' : `${prof.nome}: ${prof.fonte}`}
          </div>
          {usePush && !isHU && <Approx>Con più giocatori dietro il modello considera un solo chiamante (niente overcall): approssimazione.</Approx>}
          {!usePush && (isHU || prof.approssimato || band.approssimato) && <Approx>{isHU ? guida.avvertenze.approssimazione + ' Range heads-up derivato da equity vs mano casuale.' : band.approssimato ? band.descrizione : guida.avvertenze.approssimazione}</Approx>}
          {!usePush && !band.approssimato && <div class="tiny muted mt">{band.descrizione}</div>}
          {band.id === 'corto' && !usePush && <ShoveHint />}
        </div>
      )}

      <details class="card">
        <summary>Se qualcuno ha già rilanciato</summary>
        {guida.controRaise.map((g) => <p key={g.t} class="small"><b>{g.t}</b> — {g.d}</p>)}
      </details>
      <details class="card">
        <summary>Prima di ogni decisione</summary>
        {guida.primaDiOgniDecisione.map((g) => <p key={g.t} class="small"><b>{g.t}</b> — {g.d}</p>)}
      </details>
    </div>
  );
}

function ShoveHint() {
  return <div class="tiny muted mt">Fra 10 e 20 BB valuta anche lo shove: scheda <b>Push/Fold</b> per il range esatto al tuo stack.</div>;
}

function BBInfo() {
  const s = useAppState();
  const hu = s.config.players === 2;
  const r = hu ? baseOpenRange(s.profile, 'deep', { key: 'hu-bb', behind: 0, name: 'BB' }) : null;
  return (
    <div class="card">
      <b>Big blind</b>
      <p class="small">Dal BB non apri: se tutti foldano vinci i bui. Contro un'apertura difendi in base al range di chi apre, alla size e allo stack (hai già 1 BB in mezzo e un prezzo migliore).</p>
      {hu && r && (
        <>
          <div class="small mb">Heads-up, difesa contro min-raise (call + 3-bet): <b>{fmtNum(rangePercent(r))}%</b></div>
          <RangeGrid values={r} />
          <Approx>Approssimazione: in heads-up il BB difende circa il 65–75% contro un min-raise.</Approx>
        </>
      )}
      <p class="small muted">Contro uno shove: scheda <b>Push/Fold → Call vs shove</b>.</p>
    </div>
  );
}
