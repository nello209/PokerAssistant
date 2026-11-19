// Codifica carte: id 0..51 = rango*4 + seme. Rango 0 = "2" … 12 = "A". Semi 0..3 = ♣ ♦ ♥ ♠.
export const RANKS = '23456789TJQKA';
export const SUITS = 'cdhs';
export const SUIT_SYMBOLS = ['♣', '♦', '♥', '♠'];
export const SUIT_NAMES = ['fiori', 'quadri', 'cuori', 'picche'];

export type Card = number;

export const rankOf = (c: Card) => c >> 2;
export const suitOf = (c: Card) => c & 3;
export const makeCard = (rank: number, suit: number): Card => rank * 4 + suit;

export function cardToString(c: Card): string {
  return RANKS[rankOf(c)] + SUITS[suitOf(c)];
}

export function parseCard(s: string): Card {
  const r = RANKS.indexOf(s[0].toUpperCase());
  const su = SUITS.indexOf(s[1].toLowerCase());
  if (r < 0 || su < 0) throw new Error('Carta non valida: ' + s);
  return makeCard(r, su);
}

/** "AsKd" o "As Kd" → [carte] */
export function parseCards(s: string): Card[] {
  const t = s.replace(/[\s,]/g, '');
  const out: Card[] = [];
  for (let i = 0; i < t.length; i += 2) out.push(parseCard(t.slice(i, i + 2)));
  return out;
}

export const rankLabel = (r: number) => (r === 8 ? '10' : RANKS[r]);
