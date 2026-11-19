// Tavolo ovale con i posti: si tocca il proprio posto. Il bottone (D) è il riferimento.
import type { Seat } from '../engine/positions.ts';

/**
 * I posti sono disposti in senso orario partendo dal bottone (in basso al centro).
 * Ordine al tavolo, in senso orario: BTN, SB, BB, UTG, …, CO.
 */
export function TableSeats({ seats, selected, onPick }: { seats: Seat[]; selected: string; onPick: (key: string) => void }) {
  // seats arriva in ordine di azione preflop: [UTG…, CO, BTN, SB, BB] (oppure HU: [BTN/SB, BB])
  const n = seats.length;
  const btnIdx = seats.findIndex((s) => s.key === 'b2' || s.key === 'hu-sb');
  // ordine orario a partire dal bottone
  const clockwise = Array.from({ length: n }, (_, k) => seats[(btnIdx + k) % n]);
  const W = 340, H = 230, cx = W / 2, cy = H / 2, rx = 132, ry = 82;
  return (
    <div class="table-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} class="table-svg" role="group" aria-label="Tavolo: tocca il tuo posto">
        <ellipse cx={cx} cy={cy} rx={rx - 34} ry={ry - 30} class="felt" />
        <text x={cx} y={cy - 4} class="felt-txt">Tocca il tuo posto</text>
        <text x={cx} y={cy + 14} class="felt-sub">{n} giocatori · D = bottone</text>
        {clockwise.map((s, k) => {
          // il bottone in basso al centro, poi in senso orario (verso sinistra dello schermo)
          const a = Math.PI / 2 + (2 * Math.PI * k) / n;
          const x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a);
          const on = s.key === selected;
          const isBtn = s.key === 'b2' || s.key === 'hu-sb';
          return (
            <g key={s.key} class={'seat' + (on ? ' on' : '')} onClick={() => onPick(s.key)} role="button" aria-pressed={on} aria-label={`Posto ${s.name}`}>
              <circle cx={x} cy={y} r={on ? 27 : 24} />
              <text x={x} y={y + 1} class="seat-name">{s.name === 'BTN/SB' ? 'BTN' : s.name}</text>
              {on && <text x={x} y={y + 14} class="seat-me">IO</text>}
              {isBtn && (
                <g class="dealer">
                  <circle cx={x + (x < cx ? 22 : -22)} cy={y - 20} r={10} />
                  <text x={x + (x < cx ? 22 : -22)} y={y - 16.5}>D</text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
