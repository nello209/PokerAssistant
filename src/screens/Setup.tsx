import { useMemo, useState } from 'preact/hooks';
import { useAppState, setState, derive, fmtNum, fmtChips, levelAnte, type Level, type AnteType, type Unit } from '../state.ts';
import { Modal, NumField, Seg } from '../components/ui.tsx';
import { InfoInline } from '../components/Info.tsx';
import { generateStructure, fmtClock } from '../engine/structure.ts';

type Tab = 'struttura' | 'gioco';

export function Setup({ onClose, firstTime }: { onClose: () => void; firstTime: boolean }) {
  const [tab, setTab] = useState<Tab>(firstTime ? 'struttura' : 'gioco');
  return (
    <Modal title="Torneo" onClose={onClose}>
      <div class="mb">
        <Seg value={tab} onChange={setTab} options={[{ v: 'struttura', l: '1 · Struttura' }, { v: 'gioco', l: '2 · In gioco' }]} />
      </div>
      {tab === 'struttura' ? <StructureTab onDone={() => setTab('gioco')} /> : <PlayTab onClose={onClose} />}
    </Modal>
  );
}

// ------------------------------------------------------------------ Struttura

const HOURS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6];
const STACKS = [1500, 3000, 5000, 10000, 20000];

function StructureTab({ onDone }: { onDone: () => void }) {
  const s = useAppState();
  const c = s.config;
  const [entrants, setEntrants] = useState(c.entrants);
  const [stack, setStack] = useState(c.startingStack);
  const [hours, setHours] = useState(c.gen.hours);
  const [levelMin, setLevelMin] = useState(c.gen.levelMin);
  const [ante, setAnte] = useState<AnteType>(c.anteType);
  const [rebuys, setRebuys] = useState(c.gen.rebuys ?? 0);

  const g = useMemo(() => generateStructure({ entrants, startingStack: stack, hours, levelMin, ante, rebuys }), [entrants, stack, hours, levelMin, ante, rebuys]);
  const inUse = JSON.stringify(g.levels) === JSON.stringify(c.levels) && c.startingStack === stack && c.entrants === entrants;

  const apply = () => {
    if (s.timer.running && !confirm('Il timer è in corso: la nuova struttura ripartirà dal livello 1. Continuare?')) return;
    setState((x) => {
      x.config.entrants = entrants;
      x.config.players = Math.min(x.config.players, entrants) || entrants;
      if (x.config.startingStack !== stack || !x.settings.seenSetup) x.config.myStack = stack;
      x.config.startingStack = stack;
      x.config.levels = g.levels.map((l) => ({ ...l }));
      x.config.levelIndex = 0;
      x.config.anteType = ante;
      x.config.gen = { hours, levelMin, rebuys };
      x.config.structureId = 'generata';
      x.timer = { running: false, startedAt: 0, elapsedBefore: 0 };
    });
    onDone();
  };

  let t = 0;
  return (
    <div>
      <p class="small muted" style={{ marginTop: 0 }}>Imposta il torneo prima di iniziare: l'app propone livelli e bui adatti a quanti siete, alle fiches e al tempo che avete.</p>

      <label class="field"><span>Partecipanti al torneo</span></label>
      <div class="chips mb">
        {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <button type="button" key={n} class={'chip' + (entrants === n ? ' on' : '')} onClick={() => setEntrants(n)}>{n}</button>)}
      </div>

      <NumField label="Stack iniziale di ognuno (fiches)" value={stack} step={500} min={100} onChange={setStack} />
      <div class="chips mb" style={{ marginTop: '-4px' }}>
        {STACKS.map((v) => <button type="button" key={v} class={'chip' + (stack === v ? ' on' : '')} style={{ minHeight: '38px', fontSize: '14px' }} onClick={() => setStack(v)}>{fmtChips(v)}</button>)}
      </div>

      <label class="field"><span>Quanto volete giocare al massimo?</span></label>
      <div class="chips mb">
        {HOURS.map((h) => <button type="button" key={h} class={'chip' + (hours === h ? ' on' : '')} style={{ minWidth: '52px' }} onClick={() => setHours(h)}>{fmtNum(h)} h</button>)}
      </div>

      <NumField label="Rebuy previsti in tutto il torneo (stima)" value={rebuys} min={0} max={30} onChange={(v) => setRebuys(Math.round(v))}
        hint={rebuys ? `+${fmtChips(rebuys * stack)} fiches in gioco: i bui arrivano un po' più in alto per chiudere nel tempo.` : 'Se fate rebuy, stimate quanti in totale: le loro fiches allungano il torneo.'} />

      <label class="field"><span>Ante (facoltative)</span></label>
      <div class="mb"><Seg value={ante} onChange={setAnte} options={[{ v: 'none', l: 'Nessuna' }, { v: 'testa', l: 'A testa' }, { v: 'bb', l: 'BB ante' }]} /></div>
      <div class="mb"><InfoInline info="ante" /></div>

      <label class="field"><span>Durata dei livelli</span></label>
      <div class="mb"><Seg value={levelMin} onChange={setLevelMin} options={[{ v: 0, l: 'Auto' }, { v: 10, l: "10'" }, { v: 15, l: "15'" }, { v: 20, l: "20'" }, { v: 30, l: "30'" }]} /></div>

      <div class="card" style={{ background: 'var(--bg)' }}>
        <div class="row mb"><b class="grow">Struttura proposta</b>{inUse && <span class="small good">✓ in uso</span>}</div>
        <div class="kv mb">
          <span>Livelli</span><b>{g.planned} da {g.levelMin} minuti</b>
          <span>Fiches in gioco</span><b>{fmtChips(g.totalChips)}</b>
          <span>Si parte con</span><b>{fmtNum(g.startDepth, 0)} BB a testa</b>
          <span>I bui crescono</span><b>~{fmtNum((g.growth - 1) * 100, 0)}% a livello</b>
          <span>Fiche più piccola</span><b>{fmtChips(g.minChip)}</b>
        </div>
        {g.warning && <div class="small warn mb">{g.warning}</div>}
        <table class="t">
          <thead><tr><th>Liv.</th><th>Inizio</th><th>Bui</th><th>Ante</th><th>Stack in BB</th></tr></thead>
          <tbody>
            {g.levels.map((l, i) => {
              const start = t; t += l.min;
              return (
                <tr key={i} style={l.extra ? { opacity: 0.5 } : undefined}>
                  <td>{i + 1}{l.extra ? '*' : ''}</td>
                  <td>{fmtClock(start)}</td>
                  <td><b>{fmtChips(l.sb)}/{fmtChips(l.bb)}</b></td>
                  <td>{l.ante ? fmtChips(l.ante) : '—'}</td>
                  <td>{fmtNum(stack / l.bb, 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div class="tiny muted mt">
          * Livelli di riserva, oltre le {fmtNum(hours)} h: servono solo se il torneo si allunga.
          "Stack in BB" = lo stack iniziale diviso il big blind: quando scende sotto ~15 si gioca a push/fold.
          All'ultimo livello previsto ({fmtChips(g.levels[g.planned - 1].sb)}/{fmtChips(g.endBB)}) due giocatori rimasti avrebbero in media {fmtNum(g.totalChips / 2 / g.endBB, 0)} BB: il torneo di solito finisce prima.
        </div>
        <div class="mt"><InfoInline info="struttura" /></div>
      </div>

      <button type="button" class="btn primary block" disabled={inUse} onClick={apply}>{inUse ? 'Struttura già in uso' : 'Usa questa struttura'}</button>

      <details class="mt">
        <summary>Modifica i livelli a mano ({c.levels.length})</summary>
        <div class="tiny muted mb">Cambia i valori della struttura in uso. Se poi premi "Usa questa struttura", le modifiche a mano vengono sostituite.</div>
        <LevelsEditor levels={c.levels} onChange={(lv) => setState((x) => { x.config.levels = lv; x.config.structureId = 'custom'; x.config.levelIndex = Math.min(x.config.levelIndex, lv.length - 1); })} />
      </details>
    </div>
  );
}

// ------------------------------------------------------------------ In gioco

function PlayTab({ onClose }: { onClose: () => void }) {
  const s = useAppState();
  const c = s.config;
  const d = derive(s);
  const unit = s.settings.unit;
  const bb = d.level.bb || 1;
  const toUnit = (chips: number) => (unit === 'bb' ? Math.round((chips / bb) * 10) / 10 : chips);
  const fromUnit = (v: number) => (unit === 'bb' ? Math.round(v * bb) : v);
  const [oppText, setOppText] = useState(() => c.oppStacks.map((x) => toUnit(x)).join(' '));
  const upd = (fn: (cfg: typeof c) => void) => setState((x) => { fn(x.config); });
  const setUnit = (u: Unit) => {
    setState((x) => { x.settings.unit = u; });
    setOppText(c.oppStacks.map((x) => (u === 'bb' ? Math.round((x / bb) * 10) / 10 : x)).join(' '));
  };
  const L = c.levels;
  const timerOn = s.timer.running && s.settings.timerDrivesLevel;
  const ante = levelAnte(s, d.level);
  const planned = L.filter((l) => !l.extra).length || L.length;
  const anteFrom = L.findIndex((l) => l.ante > 0) + 1;

  return (
    <div>
      <label class="field"><span>Livello attuale</span></label>
      <div class="row mb">
        <button type="button" class="btn" disabled={c.levelIndex <= 0 || timerOn} onClick={() => upd((x) => { x.levelIndex--; })} aria-label="livello precedente">−</button>
        <div class="grow center">
          <div style={{ fontSize: '20px', fontWeight: 800 }}>{fmtChips(d.level.sb)} / {fmtChips(d.level.bb)}</div>
          <div class="tiny muted">Livello {c.levelIndex + 1} di {planned}{L.length > planned ? ` (+${L.length - planned} di riserva)` : ''} · {ante ? `ante ${fmtChips(ante)}${c.anteType === 'bb' ? ' (BB ante)' : ' a testa'}` : c.anteType === 'none' ? 'senza ante' : anteFrom > 0 ? `ante dal livello ${anteFrom}` : 'senza ante'}</div>
        </div>
        <button type="button" class="btn" disabled={c.levelIndex >= L.length - 1 || timerOn} onClick={() => upd((x) => { x.levelIndex++; })} aria-label="livello successivo">+</button>
      </div>
      {timerOn && <div class="tiny good mb">Il livello è aggiornato dal timer dei bui.</div>}

      <label class="field"><span>Giocatori ancora al tavolo</span></label>
      <div class="chips mb">
        {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <button type="button" key={n} class={'chip' + (c.players === n ? ' on' : '')} disabled={n > Math.max(c.entrants, 2) && n > c.players} onClick={() => upd((x) => { x.players = n; })}>{n}</button>)}
      </div>
      <div class="tiny muted mb" style={{ marginTop: '-4px' }}>Quando qualcuno viene eliminato, abbassa il numero: cambiano le posizioni e i range.</div>

      <div class="row" style={{ alignItems: 'flex-end' }}>
        <div class="grow">
          <NumField label={`Il mio stack (${unit === 'bb' ? 'in BB' : 'fiches'})`} value={toUnit(c.myStack)} step={unit === 'bb' ? 1 : bb} onChange={(v) => upd((x) => { x.myStack = fromUnit(v); })}
            hint={unit === 'bb' ? `= ${fmtChips(c.myStack)} fiches` : `= ${fmtNum(d.myBB)} BB · M ${fmtNum(d.m)}`} />
        </div>
      </div>
      <div class="row mb">
        <div class="grow"><Seg value={unit} onChange={setUnit} options={[{ v: 'bb', l: 'In BB' }, { v: 'chips', l: 'In fiches' }]} /></div>
        <button type="button" class="btn sm" onClick={() => upd((x) => { x.myStack = x.startingStack; })}>= iniziale</button>
      </div>

      <label class="field">
        <span>Stack degli avversari ({unit === 'bb' ? 'in BB' : 'fiches'}, facoltativo, separati da spazio)</span>
        <input type="text" inputMode="decimal" value={oppText} placeholder={unit === 'bb' ? 'es. 40 25 60' : 'es. 8000 12000 4500'}
          onInput={(e) => {
            const txt = (e.target as HTMLInputElement).value; setOppText(txt);
            const arr = txt.split(/[\s;]+/).map((x) => parseFloat(x.replace(',', '.'))).filter((x) => Number.isFinite(x) && x > 0).map(fromUnit);
            upd((x) => { x.oppStacks = arr; });
          }} />
        <small class="muted tiny">Serve per lo stack effettivo (il minore fra il tuo e quello del più grande avversario) e per l'ICM. Se vuoto, effettivo = il tuo stack.</small>
      </label>
      <div class="mb"><InfoInline info="barra" /></div>

      <button type="button" class="btn primary block mt" onClick={onClose}>Fatto</button>
    </div>
  );
}

function LevelsEditor({ levels, onChange }: { levels: Level[]; onChange: (l: Level[]) => void }) {
  const set = (i: number, k: 'sb' | 'bb' | 'ante' | 'min', v: string) => {
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
