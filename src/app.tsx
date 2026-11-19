import { useEffect, useState } from 'preact/hooks';
import { useAppState, setState, derive, timerElapsed, timerPosition, fmtNum } from './state.ts';
import { bandFor } from './engine/openRanges.ts';
import { Setup } from './screens/Setup.tsx';
import { Preflop } from './screens/Preflop.tsx';
import { Hand } from './screens/Hand.tsx';
import { PushFold } from './screens/PushFold.tsx';
import { Icm } from './screens/Icm.tsx';
import { More } from './screens/More.tsx';
import { importSharedTimer } from './screens/Timer.tsx';
import { useWakeLock } from './wakelock.ts';

type Tab = 'preflop' | 'mano' | 'push' | 'icm' | 'altro';
const TABS: { id: Tab; l: string; ic: string }[] = [
  { id: 'preflop', l: 'Preflop', ic: '▦' },
  { id: 'mano', l: 'Mano', ic: '◈' },
  { id: 'push', l: 'Push/Fold', ic: '⇪' },
  { id: 'icm', l: 'ICM', ic: '◔' },
  { id: 'altro', l: 'Altro', ic: '≡' },
];

export function App() {
  const s = useAppState();
  const [tab, setTab] = useState<Tab>(() => (sessionStorageGet('tab') as Tab) || 'preflop');
  const [setupOpen, setSetupOpen] = useState(!s.settings.seenSetup);
  const [sharedPrompt, setSharedPrompt] = useState<string | null>(null);
  useWakeLock(s.settings.wakeLock);

  useEffect(() => { document.body.classList.toggle('discreet', s.settings.discreet); }, [s.settings.discreet]);
  useEffect(() => { sessionStorageSet('tab', tab); }, [tab]);

  // Link condiviso del timer (#t=...)
  useEffect(() => {
    const m = /#t=([^&]+)/.exec(location.hash);
    if (m) setSharedPrompt(m[1]);
  }, []);

  // Il timer, se attivo, aggiorna il livello corrente
  useEffect(() => {
    const id = setInterval(() => {
      const st = s;
      if (!st.timer.running || !st.settings.timerDrivesLevel) return;
      const pos = timerPosition(st.config.levels, timerElapsed(st.timer));
      if (pos.index !== st.config.levelIndex) setState((x) => { x.config.levelIndex = pos.index; });
    }, 1000);
    return () => clearInterval(id);
  }, [s]);

  const d = derive(s);
  const band = bandFor(d.effBB);
  return (
    <div class="app">
      <button type="button" class="topbar" onClick={() => setSetupOpen(true)} aria-label="Configurazione torneo">
        <div class="lvl">
          <div>Liv. <b>{s.config.levelIndex + 1}</b> · {s.config.players} giocatori</div>
          <div><b>{fmtNum(d.level.sb, 0)}/{fmtNum(d.level.bb, 0)}</b>{d.level.ante ? ` (ante ${fmtNum(d.level.ante, 0)}${s.config.anteType === 'bb' ? ' BB' : ''})` : ''}</div>
        </div>
        <div class="stack">
          <div class="big">{fmtNum(d.myBB)} BB</div>
          <div class="small">eff {fmtNum(d.effBB)} · M {fmtNum(d.m)} · <span class={'zone ' + band.id}>{band.nome}</span></div>
        </div>
      </button>

      <main>
        {tab === 'preflop' && <Preflop />}
        {tab === 'mano' && <Hand />}
        {tab === 'push' && <PushFold />}
        {tab === 'icm' && <Icm />}
        {tab === 'altro' && <More />}
      </main>

      <nav class="tabbar">
        <div class="inner">
          {TABS.map((t) => (
            <button type="button" key={t.id} class={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
              <span class="ic">{t.ic}</span>{t.l}
            </button>
          ))}
        </div>
      </nav>

      {setupOpen && <Setup onClose={() => { setSetupOpen(false); setState((x) => { x.settings.seenSetup = true; }); }} />}
      {sharedPrompt && (
        <div class="modal-bg">
          <div class="modal">
            <h2>Timer condiviso</h2>
            <p>Hai aperto il link del timer di un altro giocatore. Vuoi usare la sua struttura dei bui e seguire il suo timer?</p>
            <div class="row">
              <button type="button" class="btn primary grow" onClick={() => { importSharedTimer(sharedPrompt); setSharedPrompt(null); history.replaceState(null, '', location.pathname); setTab('altro'); sessionStorageSet('more', 'timer'); }}>Sì, usa il timer</button>
              <button type="button" class="btn grow" onClick={() => { setSharedPrompt(null); history.replaceState(null, '', location.pathname); }}>No</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function sessionStorageGet(k: string) { try { return sessionStorage.getItem('tavolo-' + k); } catch { return null; } }
export function sessionStorageSet(k: string, v: string) { try { sessionStorage.setItem('tavolo-' + k, v); } catch { /* */ } }
