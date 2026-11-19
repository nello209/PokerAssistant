import { handName, isPair } from '../engine/ranges.ts';

/**
 * Matrice 13x13. values[i] in 0..1 (1 = in range). second = secondo range (es. call) mostrato in blu.
 * Se onToggle è presente, toccare una cella la modifica.
 */
export function RangeGrid({ values, second, onCell, selected }: {
  values: ArrayLike<number> | null;
  second?: ArrayLike<number> | null;
  onCell?: (i: number) => void;
  selected?: number | null;
}) {
  const cells = [];
  for (let i = 0; i < 169; i++) {
    const v = values ? values[i] : 0;
    const w = second ? second[i] : 0;
    let cls = 'cell';
    if (isPair(i)) cls += ' pair';
    if (v >= 0.85) cls += ' on';
    else if (v >= 0.15) cls += ' mix';
    else if (w >= 0.5) cls += ' call';
    if (selected === i) cls += ' sel';
    const name = handName(i);
    cells.push(
      <button type="button" key={i} class={cls} onClick={onCell ? () => onCell(i) : undefined} aria-label={name} aria-pressed={v >= 0.5}>
        {name.length === 3 ? name.slice(0, 2) : name}
        {name.length === 3 && <small style={{ fontSize: '0.7em', opacity: 0.7 }}>{name[2]}</small>}
      </button>,
    );
  }
  return <div class="grid13">{cells}</div>;
}
