import { useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import spiegazioni from '../data/spiegazioni.json';

export type InfoId = keyof typeof spiegazioni.voci;

function InfoBox({ id }: { id: InfoId }) {
  const v = spiegazioni.voci[id];
  return (
    <div class="info-box">
      <p><b>{v.titolo}</b></p>
      {v.testo.map((t, i) => <p key={i}>{t}</p>)}
      {v.esempio && <p class="ex"><b>Esempio:</b> {v.esempio}</p>}
      {v.alTavolo && <p class="tip"><b>Al tavolo:</b> {v.alTavolo}</p>}
    </div>
  );
}

/** Intestazione di sezione con il pulsante "Cos'è?" che apre una spiegazione semplice. */
export function SecHead({ label, info, right }: { label: ComponentChildren; info: InfoId; right?: ComponentChildren }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div class="sec-head">
        <div class="slot-label">{label}</div>
        {right}
        <button type="button" class={'info-btn' + (open ? ' on' : '')} onClick={() => setOpen(!open)} aria-expanded={open}>{open ? '✕ Chiudi' : "ⓘ Cos'è?"}</button>
      </div>
      {open && <InfoBox id={info} />}
    </>
  );
}

/** Solo il pulsante, per i punti dove l'intestazione è già presente. */
export function InfoToggle({ info, label = "ⓘ Cos'è?" }: { info: InfoId; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" class={'info-btn' + (open ? ' on' : '')} onClick={() => setOpen(!open)} aria-expanded={open}>{open ? '✕ Chiudi' : label}</button>
      {open && <InfoBox id={info} />}
    </>
  );
}

export function InfoInline({ info }: { info: InfoId }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" class={'info-btn' + (open ? ' on' : '')} onClick={() => setOpen(!open)} aria-expanded={open}>{open ? '✕ Chiudi' : `ⓘ ${spiegazioni.voci[info].titolo}`}</button>
      {open && <InfoBox id={info} />}
    </div>
  );
}
