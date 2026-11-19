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
  /** equivalente al tavolo da 8 giocatori, per spiegare da dove viene il range */
  equivalent8: string;
}

const NAME_BY_BEHIND: Record<number, string> = { 1: 'SB', 2: 'BTN', 3: 'CO', 4: 'HJ', 5: 'LJ' };
const EQ8: Record<number, string> = {
  9: 'più stretto di UTG (posto aggiunto a 10)', 8: 'più stretto di UTG (posto aggiunto a 9)',
  7: 'UTG', 6: 'UTG+1', 5: 'LJ / MP', 4: 'HJ', 3: 'CO', 2: 'BTN', 1: 'SB', 0: 'BB',
};

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
      { name: 'BTN/SB', behind: 1, key: 'hu-sb', equivalent8: 'heads-up: il bottone è anche small blind' },
      { name: 'BB', behind: 0, key: 'hu-bb', equivalent8: 'heads-up' },
    ];
  }
  const seats: Seat[] = [];
  for (let behind = players - 1; behind >= 1; behind--) {
    let name = NAME_BY_BEHIND[behind];
    if (!name) {
      // posti con ≥6 giocatori dietro: il primo è UTG, poi UTG+1, UTG+2…
      const k = players - 1 - behind;
      name = k === 0 ? 'UTG' : 'UTG+' + k;
    }
    seats.push({ name, behind, key: 'b' + behind, equivalent8: EQ8[behind] });
  }
  seats.push({ name: 'BB', behind: 0, key: 'bb', equivalent8: 'BB' });
  return seats;
}
