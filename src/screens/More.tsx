import { useState } from 'preact/hooks';
import { sessionStorageGet, sessionStorageSet } from '../app.tsx';
import { Notes } from './Notes.tsx';
import { Timer } from './Timer.tsx';
import { Tools } from './Tools.tsx';
import { Guide } from './Guide.tsx';
import { SettingsScreen } from './Settings.tsx';

const ITEMS = [
  { id: 'note', ic: '✎', l: 'Avversari e note' },
  { id: 'timer', ic: '◷', l: 'Timer dei bui' },
  { id: 'tools', ic: '⚖', l: 'SPR e size rapide' },
  { id: 'guida', ic: '☰', l: 'Guida' },
  { id: 'settings', ic: '⚙', l: 'Impostazioni, backup, installazione' },
] as const;

export function More() {
  const [page, setPage] = useState<string | null>(() => sessionStorageGet('more'));
  const go = (p: string | null) => { setPage(p); sessionStorageSet('more', p ?? ''); };
  if (page) {
    const item = ITEMS.find((x) => x.id === page);
    return (
      <div>
        <div class="row mb"><button type="button" class="btn sm ghost" onClick={() => go(null)}>‹ Indietro</button><h2 class="grow" style={{ margin: 0 }}>{item?.l}</h2></div>
        {page === 'note' && <Notes />}
        {page === 'timer' && <Timer />}
        {page === 'tools' && <Tools />}
        {page === 'guida' && <Guide />}
        {page === 'settings' && <SettingsScreen />}
      </div>
    );
  }
  return (
    <div>
      {ITEMS.map((x) => (
        <button type="button" key={x.id} class="list-btn" onClick={() => go(x.id)}><span class="ic">{x.ic}</span>{x.l}<span class="chev">›</span></button>
      ))}
    </div>
  );
}
