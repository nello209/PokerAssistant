// Posizioni al tavolo in base al numero di giocatori.
// Criterio (vedi VALIDAZIONE.md §11–14): conta quanti giocatori restano DIETRO di te.
// Il range di apertura dipende da questo numero: si tolgono/aggiungono sempre i posti più "early".

export interface Seat {
  /** nome mostrato (convenzione corrente: UTG, UTG+1, UTG+2, LJ, HJ, CO, BTN, SB, BB) */
  name: string;
  /** giocatori che parlano dopo di te preflop (0 per il BB) */
  behind: number;
  /** chiave del range di apertura: "b9" … "b1", "bb", oppure "hu-sb"/"hu-bb" in heads-up */
  key: string;
}

const NAME_BY_BEHIND: Record<number, string> = { 1: 'SB', 2: 'BTN', 3: 'CO', 4: 'HJ', 5: 'LJ' };

/** Posizione nella mano successiva: il bottone passa al giocatore alla sinistra, quindi tu "scali" di un posto. */
export function nextHandSeat(seats: Seat[], current: string): string {
  const n = seats.length;
  const btnIdx = seats.findIndex((s) => s.key === 'b2' || s.key === 'hu-sb');
  const clockwise = Array.from({ length: n }, (_, k) => seats[(btnIdx + k) % n]);
  const i = clockwise.findIndex((s) => s.key === current);
  if (i < 0) return current;
  // il bottone si muove in senso orario: rispetto al bottone tu arretri di un posto
  return clockwise[(i - 1 + n) % n].key;
}

export function seatsFor(players: number): Seat[] {
  if (players < 2 || players > 10) throw new Error('Giocatori fra 2 e 10');
  if (players === 2) {
    return [
      { name: 'BTN/SB', behind: 1, key: 'hu-sb' },
      { name: 'BB', behind: 0, key: 'hu-bb' },
    ];
  }
  const seats: Seat[] = [];
  for (let behind = players - 1; behind >= 1; behind--) {
    const k = players - 1 - behind;   // quanti parlano prima di te
    // chi parla per primo si chiama sempre UTG (da 4 giocatori in su); poi UTG+1, UTG+2… fino ai posti con nome
    let name = k === 0 && players >= 4 ? 'UTG' : NAME_BY_BEHIND[behind];
    if (!name) name = 'UTG+' + k;
    seats.push({ name, behind, key: 'b' + behind });
  }
  seats.push({ name: 'BB', behind: 0, key: 'bb' });
  return seats;
}
