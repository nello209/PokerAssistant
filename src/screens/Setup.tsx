import { useState } from 'preact/hooks';
import { useAppState, setState, STRUCTURES, derive, fmtNum, type Level } from '../state.ts';
import { Modal, NumField, Seg } from '../components/ui.tsx';
import { InfoInline } from '../components/Info.tsx';

export function Setup({ onClose }: { onClose: () => void }) {
  const s = useAppState();
  const c = s.config;
  const d = derive(s);
  const [oppText, setOppText] = useState(c.oppStacks.join(' '));
  const upd = (fn: (cfg: typeof c) => void) => setState((x) => { fn(x.config); });
  const L = c.levels;

  return (
    <Modal title="Torneo" onClose={onClose}>
      <p class="small muted" style={{ marginTop: 0 }}>Inserisci i dati del torneo: l'app li usa per calcolare il tuo stack in BB e adattare range e consigli. Puoi tornare qui in qualsiasi momento toccando la barra in alto.</p>
      <div class="mb"><InfoInline info="barra" /></div>
      <label class="field"><span>Giocatori al tavolo</span></label>
      <div class="chips mb">
        {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <button type="button" key={n} class={'chip' + (c.players === n ? ' on' : '')} onClick={() => upd((x) => { x.players = n; })}>{n}</button>
        ))}
      </div>

      <label class="field">
        <span>Struttura dei bui</span>
        <select value={c.structureId} onChange={(e) => {
          const st = STRUCTURES.find((x) => x.id === (e.target as HTMLSelectElement).value);
          if (st) upd((x) => { x.structureId = st.id; x.levels = st.levels.map((l) => ({ ...l })); x.startingStack = st.stackIniziale; x.levelIndex = 0; x.myStack = st.stackIniziale; });
          else upd((x) => { x.structureId = 'custom'; });
        }}>
          {STRUCTURES.map((st) => <option key={st.id} value={st.id}>{st.nome}</option>)}
          <option value="custom">Personalizzata (modifica sotto)</option>
        </select>
      </label>

      <div class="row">
        <div class="grow"><NumField label="Stack iniziale" value={c.startingStack} step={500} onChange={(v) => upd((x) => { x.startingStack = v; })} /></div>
        <div class="grow">
          <label class="field"><span>Ante</span></label>
          <Seg value={c.anteType} options={[{ v: 'testa', l: 'a testa' }, { v: 'bb', l: 'BB ante' }]} onChange={(v) => upd((x) => { x.anteType = v; })} />
        </div>
      </div>

      <NumField label={`Livello attuale (di ${L.length})`} value={c.levelIndex + 1} min={1} max={L.length} onChange={(v) => upd((x) => { x.levelIndex = Math.round(v) - 1; })}
        hint={`Bui ${fmtNum(d.level.sb, 0)}/${fmtNum(d.level.bb, 0)}${d.level.ante ? ', ante ' + fmtNum(d.level.ante, 0) : ''} · ${d.level.min} minuti`} />

      <NumField label="Il mio stack (fiches)" value={c.myStack} step={Math.max(d.level.bb, 1)} onChange={(v) => upd((x) => { x.myStack = v; })}
        hint={`= ${fmtNum(d.myBB)} BB · M ${fmtNum(d.m)}`} />
      <div class="row mb">
        <button type="button" class="btn sm" onClick={() => upd((x) => { x.myStack = x.startingStack; })}>= stack iniziale</button>
        <button type="button" class="btn sm" onClick={() => {
          const v = prompt('Il mio stack in BB', fmtNum(d.myBB));
          const n = v ? parseFloat(v.replace(',', '.')) : NaN;
          if (Number.isFinite(n)) upd((x) => { x.myStack = Math.round(n * d.level.bb); });
        }}>Inserisci in BB</button>
      </div>

      <label class="field">
        <span>Stack degli avversari (facoltativo, separati da spazio)</span>
        <input type="text" inputMode="decimal" value={oppText} placeholder="es. 8000 12000 4500"
          onInput={(e) => {
            const t = (e.target as HTMLInputElement).value; setOppText(t);
            const arr = t.split(/[\s;]+/).map((x) => parseFloat(x.replace(',', '.'))).filter((x) => Number.isFinite(x) && x > 0);
            upd((x) => { x.oppStacks = arr; });
          }} />
        <small class="muted tiny">Serve per lo stack effettivo (il minore fra il tuo e quello del più grande avversario) e per l'ICM. Se vuoto, effettivo = il tuo stack.</small>
      </label>

      <details>
        <summary>Modifica i livelli ({L.length})</summary>
        <LevelsEditor levels={L} onChange={(lv) => upd((x) => { x.levels = lv; x.structureId = 'custom'; x.levelIndex = Math.min(x.levelIndex, lv.length - 1); })} />
      </details>

      <button type="button" class="btn primary block mt" onClick={onClose}>Fatto</button>
    </Modal>
  );
}

function LevelsEditor({ levels, onChange }: { levels: Level[]; onChange: (l: Level[]) => void }) {
  const set = (i: number, k: keyof Level, v: string) => {
    const n = parseFloat(v.replace(',', '.'));
    if (!Number.isFinite(n)) return;
    const lv = levels.map((l) => ({ ...l }));
    lv[i][k] = n;
    onChange(lv);
  };
  return (
    <div>
      <table class="t">
        <thead><tr><th>#</th><th>SB</th><th>BB</th><th>Ante</th><th>Min</th><th></th></tr></thead>
        <tbody>
          {levels.map((l, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              {(['sb', 'bb', 'ante', 'min'] as const).map((k) => (
                <td key={k}><input type="number" inputMode="decimal" style={{ minHeight: '38px', padding: '0 4px', textAlign: 'right' }} value={l[k]} onChange={(e) => set(i, k, (e.target as HTMLInputElement).value)} /></td>
              ))}
              <td><button type="button" class="btn sm ghost danger" onClick={() => onChange(levels.filter((_, j) => j !== i))} aria-label="elimina">✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" class="btn sm mt" onClick={() => {
        const last = levels[levels.length - 1] ?? { sb: 25, bb: 50, ante: 0, min: 20 };
        onChange([...levels, { sb: last.sb * 2, bb: last.bb * 2, ante: last.ante * 2, min: last.min }]);
      }}>+ Aggiungi livello</button>
    </div>
  );
}
