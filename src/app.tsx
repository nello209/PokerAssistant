import { useEffect, useState } from 'preact/hooks';
import { useAppState, setState, derive, timerElapsed, timerPosition, fmtNum, fmtChips, fmtAmount, levelAnte } from './state.ts';
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
  const unit = s.settings.unit;
  const ante = levelAnte(s, d.level);
  return (
    <div class="app">
      <div class="topbar">
        <button type="button" class="lvl" onClick={() => setSetupOpen(true)} aria-label="Configurazione torneo">
          <div>Liv. <b>{s.config.levelIndex + 1}</b> · {s.config.players} al tavolo ⚙</div>
          <div><b>{fmtChips(d.level.sb)}/{fmtChips(d.level.bb)}</b>{ante ? ` ante ${fmtChips(ante)}${s.config.anteType === 'bb' ? ' BB' : ''}` : ''}</div>
        </button>
        <button type="button" class="stack" onClick={() => setState((x) => { x.settings.unit = x.settings.unit === 'bb' ? 'chips' : 'bb'; })} aria-label="Cambia unità: BB o fiches">
          <div class="big">{fmtAmount(s.config.myStack, d.level.bb, unit)} <span class="unit-sw">⇄</span></div>
          <div class="small">eff {fmtAmount(d.effStack, d.level.bb, unit)} · M {fmtNum(d.m)} · <span class={'zone ' + band.id}>{band.nome}</span></div>
        </button>
      </div>

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

      {setupOpen && <Setup firstTime={!s.settings.seenSetup} onClose={() => { setSetupOpen(false); setState((x) => { x.settings.seenSetup = true; }); }} />}
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
