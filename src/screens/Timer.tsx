import { useEffect, useRef, useState } from 'preact/hooks';
import qrcode from 'qrcode-generator';
import { useAppState, setState, getState, timerElapsed, timerPosition, fmtNum, levelAnte, type Level, type AnteType } from '../state.ts';
import { InfoInline } from '../components/Info.tsx';

const mmss = (ms: number) => {
  const t = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

interface SharePayload { l: number[][]; a: AnteType; e: number; at: number; r: boolean }

const b64url = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

export function shareLink(): string {
  const s = getState();
  const now = Date.now();
  const p: SharePayload = { l: s.config.levels.map((x) => [x.sb, x.bb, x.ante, x.min]), a: s.config.anteType, e: timerElapsed(s.timer, now), at: now, r: s.timer.running };
  return location.origin + location.pathname + '#t=' + b64url(JSON.stringify(p));
}

export function importSharedTimer(encoded: string) {
  try {
    const p = JSON.parse(unb64url(encoded)) as SharePayload;
    const levels: Level[] = p.l.map(([sb, bb, ante, min]) => ({ sb, bb, ante, min }));
    const elapsed = p.e + (p.r ? Date.now() - p.at : 0);
    setState((x) => {
      x.config.levels = levels; x.config.anteType = p.a; x.config.structureId = 'custom';
      x.timer = p.r ? { running: true, startedAt: Date.now() - elapsed, elapsedBefore: 0, followShared: true } : { running: false, startedAt: 0, elapsedBefore: elapsed, followShared: true };
      x.settings.timerDrivesLevel = true;
      x.config.levelIndex = timerPosition(levels, elapsed).index;
    });
  } catch {
    alert('Link del timer non valido.');
  }
}

function beep() {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.15, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    o.start(); o.stop(ctx.currentTime + 0.8);
  } catch { /* audio non disponibile */ }
  navigator.vibrate?.([300, 150, 300]);
}

export function Timer() {
  const s = useAppState();
  const [, tick] = useState(0);
  const [full, setFull] = useState(false);
  const [share, setShare] = useState<string | null>(null);
  const lastIdx = useRef<number | null>(null);
  useEffect(() => { const id = setInterval(() => tick((x) => x + 1), 500); return () => clearInterval(id); }, []);

  const L = s.config.levels;
  const el = timerElapsed(s.timer);
  const pos = timerPosition(L, el);
  const lv = L[pos.index];
  const next = L[pos.index + 1];
  const finished = pos.remaining <= 0 && pos.index === L.length - 1;

  useEffect(() => {
    if (lastIdx.current !== null && lastIdx.current !== pos.index && s.timer.running) beep();
    lastIdx.current = pos.index;
  }, [pos.index]);

  const start = () => setState((x) => { x.timer = { ...x.timer, running: true, startedAt: Date.now() }; });
  const pause = () => setState((x) => { x.timer = { ...x.timer, running: false, elapsedBefore: timerElapsed(x.timer), startedAt: 0 }; });
  const jumpTo = (idx: number) => setState((x) => {
    const i = Math.max(0, Math.min(L.length - 1, idx));
    let acc = 0; for (let k = 0; k < i; k++) acc += L[k].min * 60000;
    x.timer = { ...x.timer, elapsedBefore: acc, startedAt: Date.now() };
    x.config.levelIndex = i;
  });
  const reset = () => { if (confirm('Azzerare il timer?')) setState((x) => { x.timer = { running: false, startedAt: 0, elapsedBefore: 0 }; x.config.levelIndex = 0; }); };

  const display = (
    <div>
      <div class="center muted" style={{ fontSize: full ? '22px' : '15px' }}>Livello {pos.index + 1} di {L.length}</div>
      <div class="timer-big" style={{ color: pos.remaining < 60000 && s.timer.running ? 'var(--amber)' : undefined }}>{finished ? 'FINE' : mmss(pos.remaining)}</div>
      <div class="timer-blinds">{fmtNum(lv.sb, 0)} / {fmtNum(lv.bb, 0)}{levelAnte(s, lv) ? <span class="muted" style={{ fontSize: '0.55em' }}> ante {fmtNum(levelAnte(s, lv), 0)}</span> : null}</div>
      {next && <div class="center muted mt" style={{ fontSize: full ? '22px' : '15px' }}>Poi: {fmtNum(next.sb, 0)}/{fmtNum(next.bb, 0)}{levelAnte(s, next) ? ` ante ${fmtNum(levelAnte(s, next), 0)}` : ''} · {next.min}'</div>}
    </div>
  );

  if (full) {
    return (
      <div class="fullscreen" onClick={() => { setFull(false); document.exitFullscreen?.().catch(() => {}); }}>
        {display}
        <div class="center tiny muted mt">Tocca per uscire</div>
      </div>
    );
  }

  return (
    <div>
      <div class="mb"><InfoInline info="timer" /></div>
      <div class="card">{display}</div>
      <div class="row mb">
        <button type="button" class="btn" onClick={() => jumpTo(pos.index - 1)} aria-label="livello precedente">‹ Liv</button>
        {s.timer.running ? <button type="button" class="btn grow" onClick={pause}>Pausa</button> : <button type="button" class="btn primary grow" onClick={start}>{el > 0 ? 'Riprendi' : 'Avvia'}</button>}
        <button type="button" class="btn" onClick={() => jumpTo(pos.index + 1)} aria-label="livello successivo">Liv ›</button>
      </div>
      <div class="row mb">
        <button type="button" class="btn grow" onClick={() => { setFull(true); document.documentElement.requestFullscreen?.().catch(() => {}); }}>Schermo intero</button>
        <button type="button" class="btn grow" onClick={() => setShare(shareLink())}>Condividi</button>
        <button type="button" class="btn ghost danger" onClick={reset}>Azzera</button>
      </div>
      <label class="row small card" style={{ cursor: 'pointer' }}>
        <input type="checkbox" style={{ width: '22px', height: '22px' }} checked={s.settings.timerDrivesLevel} onChange={(e) => setState((x) => { x.settings.timerDrivesLevel = (e.target as HTMLInputElement).checked; })} />
        <span>Il timer aggiorna il livello in alto (bui usati in tutta l'app)</span>
      </label>
      {share && <ShareBox url={share} />}
      <p class="tiny muted">La struttura si crea o si modifica toccando la barra in alto → scheda Struttura. Il timer continua a contare anche se chiudi l'app: si basa sull'orario di avvio.</p>
    </div>
  );
}

function ShareBox({ url }: { url: string }) {
  const qr = qrcode(0, 'L');
  qr.addData(url);
  qr.make();
  const svg = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  return (
    <div class="card center">
      <div class="small mb">Fai inquadrare questo QR agli altri giocatori (o invia il link): vedranno lo stesso timer sul loro telefono.</div>
      <div class="qr" dangerouslySetInnerHTML={{ __html: svg }} />
      <div class="row mt">
        <button type="button" class="btn sm grow" onClick={() => navigator.clipboard?.writeText(url).then(() => alert('Link copiato'))}>Copia link</button>
        {'share' in navigator && <button type="button" class="btn sm grow" onClick={() => navigator.share({ title: 'Timer torneo', url }).catch(() => {})}>Invia…</button>}
      </div>
      <div class="tiny muted mt">Il link contiene struttura e orario di avvio: se poi metti in pausa o cambi livello, condividi di nuovo. Serve che l'app sia online (pubblicata) perché il link si apra sugli altri telefoni.</div>
    </div>
  );
}
