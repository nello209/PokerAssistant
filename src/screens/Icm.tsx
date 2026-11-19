import { useState } from 'preact/hooks';
import { useAppState, setState, fmtNum, fmtChips } from '../state.ts';
import { icm, prizePool, prizesFromPool } from '../engine/icm.ts';
import guida from '../data/guida.json';
import { InfoInline } from '../components/Info.tsx';
import { NumField, Seg } from '../components/ui.tsx';

const SPLITS = ['100', '65/35', '60/30/10', '50/30/20'];

function PoolCard({ onUse }: { onUse: (p: number[]) => void }) {
  const s = useAppState();
  const p = s.pool;
  const entrants = s.config.entrants;
  const upd = (patch: Partial<typeof p>) => setState((x) => { x.pool = { ...x.pool, ...patch }; });
  const total = prizePool(entrants, p.buyIn, p.rebuys, p.rebuyCost);
  const prizes = prizesFromPool(total, p.split.split('/').map(Number));
  return (
    <details class="card">
      <summary>Calcola i premi dal montepremi (con i rebuy)</summary>
      <p class="tiny muted">Contate i rebuy durante la serata (o alla fine): qui servono solo per sapere quanti soldi ci sono in palio.</p>
      <NumField label="Quota d'iscrizione (€)" value={p.buyIn} step={5} onChange={(v) => upd({ buyIn: v })} />
      <NumField label="Rebuy fatti in tutto" value={p.rebuys} min={0} max={99} onChange={(v) => upd({ rebuys: Math.round(v) })} />
      <NumField label="Costo di un rebuy (€)" value={p.rebuyCost} step={5} onChange={(v) => upd({ rebuyCost: v })} />
      <label class="field"><span>Come dividete i premi (%)</span></label>
      <div class="mb"><Seg value={p.split} onChange={(v) => upd({ split: v })} options={SPLITS.map((x) => ({ v: x, l: x === '100' ? 'Tutto al 1°' : x }))} /></div>
      <div class="small mb">
        {entrants} iscritti × {fmtNum(p.buyIn, 2)} €{p.rebuys ? ` + ${p.rebuys} rebuy × ${fmtNum(p.rebuyCost, 2)} €` : ''} = <b>{fmtNum(total, 2)} €</b><br />
        {prizes.map((x, i) => <span key={i}>{i ? ' · ' : ''}{i + 1}° <b>{fmtNum(x, 2)} €</b></span>)}
      </div>
      <button type="button" class="btn primary block" onClick={() => onUse(prizes)}>Usa questi premi</button>
      <p class="tiny muted">Gli iscritti ({entrants}) sono quelli della configurazione (⚙ → Struttura).</p>
    </details>
  );
}

interface P { name: string; stack: number }

export function Icm() {
  const s = useAppState();
  const [players, setPlayers] = useState<P[]>(() => {
    const opp = s.config.oppStacks;
    if (opp.length) return [{ name: 'Io', stack: s.config.myStack }, ...opp.map((x, i) => ({ name: 'G' + (i + 2), stack: x }))];
    return [{ name: 'Io', stack: 5000 }, { name: 'G2', stack: 3000 }, { name: 'G3', stack: 2000 }];
  });
  const prizes = s.prizes;
  const setPrizes = (p: number[]) => setState((x) => { x.prizes = p; });

  const stacks = players.map((p) => Math.max(0, p.stack || 0));
  const totalChips = stacks.reduce((a, b) => a + b, 0);
  const pool = prizes.reduce((a, b) => a + (b || 0), 0);
  const ev = totalChips > 0 ? icm(stacks, prizes) : stacks.map(() => 0);
  const evenSplit = players.length ? pool / players.length : 0;
  const paidPlaces = Math.min(prizes.length, players.length);
  const prizesSorted = prizes.every((p, i) => i === 0 || p <= prizes[i - 1]);

  const num = (v: string) => { const n = parseFloat(v.replace(',', '.')); return Number.isFinite(n) ? n : 0; };

  return (
    <div>
      <div class="mb"><InfoInline info="icm" /></div>
      <PoolCard onUse={setPrizes} />
      <div class="card">
        <div class="slot-label">Premi (dal 1° posto)</div>
        {prizes.map((p, i) => (
          <div class="row mb" key={i}>
            <b style={{ width: '34px' }}>{i + 1}°</b>
            <input type="number" inputMode="decimal" value={p} onInput={(e) => setPrizes(prizes.map((x, j) => (j === i ? num((e.target as HTMLInputElement).value) : x)))} />
            <button type="button" class="btn sm ghost danger" onClick={() => setPrizes(prizes.filter((_, j) => j !== i))} aria-label="rimuovi">✕</button>
          </div>
        ))}
        <div class="row">
          <button type="button" class="btn sm" onClick={() => setPrizes([...prizes, 0])}>+ premio</button>
          <span class="grow right small muted" style={{ textAlign: 'right' }}>Montepremi {fmtNum(pool, 2)}</span>
        </div>
        {!prizesSorted && <div class="tiny warn mt">I premi dovrebbero essere in ordine decrescente.</div>}
      </div>

      <div class="card">
        <div class="slot-label">Giocatori rimasti e stack</div>
        {players.map((p, i) => (
          <div class="row mb" key={i}>
            <input type="text" value={p.name} style={{ width: '90px', flex: 'none' }} onInput={(e) => setPlayers(players.map((x, j) => (j === i ? { ...x, name: (e.target as HTMLInputElement).value } : x)))} />
            <input type="number" inputMode="decimal" value={p.stack} onInput={(e) => setPlayers(players.map((x, j) => (j === i ? { ...x, stack: num((e.target as HTMLInputElement).value) } : x)))} />
            <button type="button" class="btn sm ghost danger" disabled={players.length <= 1} onClick={() => setPlayers(players.filter((_, j) => j !== i))} aria-label="rimuovi">✕</button>
          </div>
        ))}
        <button type="button" class="btn sm" disabled={players.length >= 10} onClick={() => setPlayers([...players, { name: 'G' + (players.length + 1), stack: 1000 }])}>+ giocatore</button>
      </div>

      <div class="card">
        <div class="slot-label">Valore in premi (ICM Malmuth-Harville)</div>
        <table class="t">
          <thead><tr><th>Giocatore</th><th>Chip</th><th>ICM</th><th>Chip chop</th><th>Diviso =</th></tr></thead>
          <tbody>
            {players.map((p, i) => (
              <tr key={i}>
                <td><b>{p.name}</b></td>
                <td>{fmtNum(totalChips ? (stacks[i] / totalChips) * 100 : 0)}%</td>
                <td><b>{fmtNum(ev[i], 2)}</b></td>
                <td>{fmtNum(totalChips ? (stacks[i] / totalChips) * pool : 0, 2)}</td>
                <td>{fmtNum(evenSplit, 2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td>Totale</td><td>{fmtChips(totalChips)}</td><td>{fmtNum(ev.reduce((a, b) => a + b, 0), 2)}</td><td>{fmtNum(pool, 2)}</td><td>{fmtNum(pool, 2)}</td></tr></tfoot>
        </table>
        <div class="tiny muted mt">
          ICM: valore atteso dei premi in base agli stack (probabilità di arrivare in ogni posto proporzionali alle chip). Chip chop: montepremi × quota di chip. {paidPlaces < prizes.length && 'Ci sono più premi che giocatori: quelli in più sono ignorati.'}
          {players.length === 2 && ' A due giocatori ICM = secondo premio + quota chip × (primo − secondo).'}
        </div>
      </div>

      <details class="card">
        <summary>ICM e accordi: cosa ricordare</summary>
        {guida.icm.map((t, i) => <p key={i} class="small">{t}</p>)}
      </details>
    </div>
  );
}
