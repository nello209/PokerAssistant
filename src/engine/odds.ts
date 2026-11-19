// Formule della Fase 1 (verificate in VALIDAZIONE.md).

/** Equity minima per chiamare: B / (P + 2B), con P = piatto prima della puntata avversaria. */
export const requiredEquity = (potBeforeBet: number, bet: number) => bet / (potBeforeBet + 2 * bet);

/** Variante comoda al tavolo: piatto già comprensivo della puntata da chiamare. */
export const requiredEquityFromPot = (potIncludingBet: number, toCall: number) => toCall / (potIncludingBet + toCall);

/** Fold necessari a un bluff puro: B / (P + B). */
export const bluffFoldNeeded = (pot: number, bet: number) => bet / (pot + bet);

/** EV del call rispetto al fold (stesse unità degli input). potIncludingBet = piatto al centro dopo la puntata. */
export const callEV = (equity: number, potIncludingBet: number, toCall: number) => equity * (potIncludingBet + toCall) - toCall;

/** Probabilità di colpire con outs puliti. unseen = 47 al flop, 46 al turn. */
export const hitOneCard = (outs: number, unseen: number) => outs / unseen;
export const hitTwoCards = (outs: number, unseen = 47) => 1 - ((unseen - outs) / unseen) * ((unseen - 1 - outs) / (unseen - 1));

/** Regola rapida ×4 con correzione sopra gli 8 outs (percentuale). */
export const ruleOf4 = (outs: number) => outs * 4 - Math.max(0, outs - 8);
export const ruleOf2 = (outs: number) => outs * 2;

/** Stack effettivo in BB. */
export const effectiveBB = (myStack: number, oppStack: number, bb: number) => Math.min(myStack, oppStack) / bb;

/** M di Harrington: stack / (SB + BB + ante totali di un giro). */
export const mRatio = (stack: number, sb: number, bb: number, anteTotal: number) => stack / (sb + bb + anteTotal);

/** SPR: stack effettivo residuo / piatto al flop. */
export const spr = (effectiveStackBehind: number, potOnFlop: number) => effectiveStackBehind / potOnFlop;

/** Odds "x a 1" contro. */
export const oddsAgainst = (p: number) => (p <= 0 ? Infinity : (1 - p) / p);
