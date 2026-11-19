import type { ComponentChildren } from 'preact';
import { RANKS, SUITS, SUIT_SYMBOLS, rankLabel } from '../engine/cards.ts';

export function PCard({ c, active, dim, hl, onClick, label }: { c: number | null; active?: boolean; dim?: boolean; hl?: boolean; onClick?: () => void; label?: string }) {
  if (c === null || c === undefined) {
    return <button type="button" class={'pcard empty' + (active ? ' active' : '')} onClick={onClick} aria-label={label ?? 'carta vuota'}>{label ?? '+'}</button>;
  }
  const r = c >> 2, s = c & 3;
  return (
    <button type="button" class={`pcard ${SUITS[s]}${active ? ' active' : ''}${dim ? ' dim' : ''}${hl ? ' hl' : ''}`} onClick={onClick} aria-label={RANKS[r] + SUITS[s]}>
      <span>{rankLabel(r)}</span><span class="s">{SUIT_SYMBOLS[s]}</span>
    </button>
  );
}

export function CardText({ c }: { c: number }) {
  const s = c & 3;
  const col = ['var(--suit-c)', 'var(--suit-d)', 'var(--suit-h)', 'var(--suit-s)'][s];
  return <b style={{ color: col, whiteSpace: 'nowrap' }}>{rankLabel(c >> 2)}{SUIT_SYMBOLS[s]}</b>;
}

/** Selettore carte 4 righe (semi) × 13 colonne (ranghi): un tocco per carta. */
export function CardPicker({ used, onPick }: { used: Set<number>; onPick: (c: number) => void }) {
  const cells = [];
  for (const s of [3, 2, 1, 0]) for (let r = 12; r >= 0; r--) {
    const c = r * 4 + s;
    cells.push(
      <button type="button" key={c} class={SUITS[s]} disabled={used.has(c)} onClick={() => onPick(c)} aria-label={RANKS[r] + SUITS[s]}>
        <span>{rankLabel(r)}</span><span class="s">{SUIT_SYMBOLS[s]}</span>
      </button>,
    );
  }
  return <div class="picker">{cells}</div>;
}

export function Seg<T extends string | number>({ value, options, onChange }: { value: T; options: { v: T; l: ComponentChildren }[]; onChange: (v: T) => void }) {
  return (
    <div class="seg">
      {options.map((o) => <button type="button" key={String(o.v)} class={o.v === value ? 'on' : ''} onClick={() => onChange(o.v)}>{o.l}</button>)}
    </div>
  );
}

export function NumField({ label, value, onChange, step = 1, min = 0, max, hint }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; hint?: string }) {
  const clamp = (v: number) => Math.min(max ?? Infinity, Math.max(min, v));
  return (
    <label class="field">
      <span>{label}</span>
      <div class="stepper">
        <button type="button" onClick={() => onChange(clamp(+(value - step).toFixed(4)))} aria-label="meno">−</button>
        <input type="number" inputMode="decimal" value={Number.isFinite(value) ? value : ''} min={min} max={max} step={step}
          onInput={(e) => { const v = parseFloat((e.target as HTMLInputElement).value.replace(',', '.')); if (Number.isFinite(v)) onChange(clamp(v)); }} />
        <button type="button" onClick={() => onChange(clamp(+(value + step).toFixed(4)))} aria-label="più">+</button>
      </div>
      {hint && <small class="muted tiny">{hint}</small>}
    </label>
  );
}

export function Modal({ onClose, children, title }: { onClose: () => void; children: ComponentChildren; title?: string }) {
  return (
    <div class="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="modal">
        <div class="row mb">
          <h2 class="grow" style={{ margin: 0 }}>{title}</h2>
          <button type="button" class="btn sm ghost" onClick={onClose}>Chiudi</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Approx({ children }: { children: ComponentChildren }) {
  return <div class="approx">≈ {children}</div>;
}
