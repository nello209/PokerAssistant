import { useState } from 'preact/hooks';
import { useAppState, setState } from '../state.ts';
import avversari from '../data/avversari.json';
import { InfoInline } from '../components/Info.tsx';

export function Notes() {
  const s = useAppState();
  const [name, setName] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [text, setText] = useState('');

  const add = () => {
    const n = name.trim();
    if (!n) return;
    const id = Date.now().toString(36);
    setState((x) => { x.notes.unshift({ id, name: n, profile: '', entries: [] }); });
    setName(''); setOpen(id);
  };

  return (
    <div>
      <div class="mb"><InfoInline info="note" /></div>
      <div class="card">
        <div class="row">
          <input type="text" placeholder="Nome del giocatore" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <button type="button" class="btn primary" onClick={add}>Aggiungi</button>
        </div>
        <div class="tiny muted mt">{avversari.esempioNota}</div>
      </div>

      {s.notes.map((n) => {
        const prof = avversari.profili.find((p) => p.id === n.profile);
        const isOpen = open === n.id;
        return (
          <div class="card" key={n.id}>
            <button type="button" class="row" style={{ width: '100%', background: 'none', border: 0, padding: 0, textAlign: 'left', minHeight: '40px' }} onClick={() => setOpen(isOpen ? null : n.id)}>
              <b class="grow">{n.name}</b>
              <span class="small muted">{prof ? prof.nome : 'profilo ?'} · {n.entries.length} note</span>
            </button>
            {isOpen && (
              <div class="mt">
                <div class="chips mb">
                  {avversari.profili.map((p) => (
                    <button type="button" key={p.id} class={'chip' + (n.profile === p.id ? ' on' : '')} style={{ minWidth: 0, fontSize: '13px' }}
                      onClick={() => setState((x) => { const t = x.notes.find((y) => y.id === n.id)!; t.profile = t.profile === p.id ? '' : p.id; })}>{p.nome}</button>
                  ))}
                </div>
                {prof && (
                  <div class="small mb">
                    <div class="muted">{prof.segnali}</div>
                    <div><b>Adattamento:</b> {prof.adattamento}</div>
                  </div>
                )}
                <textarea placeholder="Situazione / mano mostrata (es. BTN 18 BB, call shove con K8o)" value={text} onInput={(e) => setText((e.target as HTMLTextAreaElement).value)} />
                <div class="row mt">
                  <button type="button" class="btn primary grow" disabled={!text.trim()} onClick={() => { setState((x) => { x.notes.find((y) => y.id === n.id)!.entries.unshift({ t: Date.now(), text: text.trim() }); }); setText(''); }}>Salva nota</button>
                  <button type="button" class="btn ghost danger" onClick={() => { if (confirm(`Eliminare ${n.name} e le sue note?`)) setState((x) => { x.notes = x.notes.filter((y) => y.id !== n.id); }); }}>Elimina</button>
                </div>
                {n.entries.map((e) => (
                  <div key={e.t} class="small mt" style={{ borderTop: '1px solid var(--line)', paddingTop: '8px' }}>
                    <span class="tiny muted">{new Date(e.t).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    <div class="row"><span class="grow">{e.text}</span>
                      <button type="button" class="btn sm ghost" aria-label="elimina nota" onClick={() => setState((x) => { const t = x.notes.find((y) => y.id === n.id)!; t.entries = t.entries.filter((z) => z.t !== e.t); })}>✕</button></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <details class="card">
        <summary>Profili e osservazioni utili</summary>
        {avversari.profili.map((p) => <p key={p.id} class="small"><b>{p.nome}</b> — {p.segnali} <i>{p.adattamento}</i></p>)}
        <h3>Osserva</h3>
        {avversari.osservazioni.map((o) => <p key={o.t} class="small"><b>{o.t}</b> — {o.d}</p>)}
      </details>
    </div>
  );
}
