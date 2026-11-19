# Validazione di `Poker_Tornei.xlsx`

Data: 19/11/2026 · Il file Excel **non è stato modificato**. Letto con Python 3.13 + openpyxl 3.1.5
(valori, formule, risultati in cache e colori di riempimento cella per cella).

Legenda esiti: **OK** = corretto · **ERRORE** = sbagliato in modo oggettivo · **IMPRECISO** = vero ma
incompleto o ambiguo · **DISCUTIBILE** = scelta strategica difendibile ma lontana dalla teoria corrente.

---

## Riepilogo

| # | Punto | Esito |
|---|-------|-------|
| 1 | Liste scritte vs matrici colorate (7 posizioni, 169 mani ciascuna) | **OK**: identiche mano per mano |
| 2 | Percentuali di combinazioni dichiarate | **OK** (tutte entro ±0,05 % per arrotondamento) |
| 3 | Pot odds B/(P+2B) e tabella | **OK** |
| 4 | Fold necessari al bluff B/(P+B) e tabella | **OK** |
| 5 | Outs /47, /46, flop→river e conteggio progetti combinati | **OK** |
| 6 | Regola rapida ×2 / ×4 | **IMPRECISO**: manca la correzione per molti outs |
| 7 | EV del call e calcolatore | **OK** |
| 8 | Esempio progetto colore | **OK** |
| 9 | Stack effettivo in BB | **OK** (manca solo l'effetto ante) |
| 10 | ICM a due | **OK** (coincide con Malmuth-Harville) |
| 11 | Posizioni con 7 giocatori | **ERRORE**: va eliminato UTG, non UTG+1 |
| 12 | Posizioni con 9 giocatori | **ERRORE**: il posto nuovo è il primo, non uno in mezzo |
| 13 | Posizioni con 10 giocatori | **MANCANTE** |
| 14 | Posizioni con 6, 5, 4, 3, 2 giocatori | **OK** |
| 15 | Range di apertura (ampiezza) | **DISCUTIBILE**: molto stretti nei posti early |
| 16 | Composizione dei range (assi suited piccoli) | **DISCUTIBILE** |
| 17 | Size (open, iso, 3-bet, c-bet) | OK, salvo 3-bet OOP **DISCUTIBILE** a 40 BB |
| 18 | Push-fold | **IMPRECISO**: corretto ma senza range numerici |
| 19 | ICM, accordi, heads-up | **OK** |
| 20 | Lettura avversari | **OK** (qualitativo) |
| 21 | Fonti citate | **NON VERIFICABILI** da qui (vedi sotto) |

**Errori oggettivi trovati: 2 (+1 caso mancante), tutti nella regola delle posizioni.** La matematica è
interamente corretta, e liste e matrici coincidono senza eccezioni.

---

## A. Errori oggettivi (matematica e coerenza)

### 1. Liste scritte vs matrici colorate: OK

Metodo: per ogni matrice ho letto le 169 celle e il colore (oro `#D1A64D` = raise) e verificato che
l'etichetta di ogni cella fosse quella attesa (coppie sulla diagonale, suited sopra, offsuit sotto).
Poi ho espanso la lista scritta in "Range e Sizes" (es. `K9s+` → K9s, KTs, KJs, KQs) e confrontato i due
insiemi. Ho controllato anche la didascalia sotto ogni matrice.

| Posizione | Mani | Solo in matrice | Solo in lista | Didascalia = lista | Etichette celle |
|-----------|-----:|-----------------|---------------|:------------------:|-----------------|
| UTG       | 19 | – | – | sì | corrette |
| UTG+1     | 24 | – | – | sì | corrette |
| LJ / MP   | 32 | – | – | sì | corrette |
| HJ        | 43 | – | – | sì | corrette |
| CO        | 57 | – | – | sì | corrette |
| BTN       | 82 | – | – | sì | corrette |
| SB        | 64 | – | – | sì | corrette |

Anche la nidificazione è coerente: ogni range contiene interamente quello della posizione precedente
(UTG ⊂ UTG+1 ⊂ LJ ⊂ HJ ⊂ CO ⊂ BTN). L'SB contiene il CO più A5o, A6o, K2s–K4s, Q6s, Q7s ed è contenuto nel BTN.

### 2. Percentuali di combinazioni: OK

Pesi: coppie C(4,2) = 6, suited 4, offsuit 4×3 = 12. Controllo totale: 13×6 + 78×4 + 78×12 = **1326** = C(52,2). ✔

| Posizione | Coppie ×6 | Suited ×4 | Offsuit ×12 | Combo | % calcolata | % dichiarata |
|-----------|-----------|-----------|-------------|------:|------------:|-------------:|
| UTG   | 8 → 48  | 7 → 28   | 4 → 48   | 124 | 9,35 %  | 9,4 % ✔ |
| UTG+1 | 9 → 54  | 10 → 40  | 5 → 60   | 154 | 11,61 % | 11,6 % ✔ |
| LJ/MP | 10 → 60 | 16 → 64  | 6 → 72   | 196 | 14,78 % | 14,8 % ✔ |
| HJ    | 11 → 66 | 23 → 92  | 9 → 108  | 266 | 20,06 % | 20,1 % ✔ |
| CO    | 13 → 78 | 31 → 124 | 13 → 156 | 358 | 27,00 % | 27,0 % ✔ |
| BTN   | 13 → 78 | 46 → 184 | 23 → 276 | 538 | 40,57 % | 40,6 % ✔ |
| SB    | 13 → 78 | 36 → 144 | 15 → 180 | 402 | 30,32 % | 30,3 % ✔ |

### 3. Pot odds: OK

L'avversario punta B in un piatto P. Tu chiami B, il piatto finale è P + 2B, quindi l'equity minima è
B / (P + 2B). Con x = B/P la formula del foglio è `x/(1+2x)`, equivalente. Ricalcolo:

| B/P | 1/4 | 1/3 | 1/2 | 2/3 | 3/4 | 1 | 1,5 |
|-----|----:|----:|----:|----:|----:|--:|----:|
| Equity minima (foglio = ricalcolo) | 16,67 % | 20,00 % | 25,00 % | 28,57 % | 30,00 % | 33,33 % | 37,50 % |

### 4. Fold necessari al bluff puro: OK

Rischi B per vincere P: break-even quando f·P = (1−f)·B, cioè f = B / (P + B). Formula del foglio `x/(1+x)`. ✔

| B/P | 1/4 | 1/3 | 1/2 | 2/3 | 3/4 | 1 | 1,5 |
|-----|----:|----:|----:|----:|----:|--:|----:|
| Fold richiesti | 20,0 % | 25,0 % | 33,3 % | 40,0 % | 42,9 % | 50,0 % | 60,0 % |

Anche la nota ("è la percentuale di fold richiesta, non la quota di bluff nel tuo range") è corretta.

### 5. Outs: OK

Al flop restano 52 − 2 − 3 = **47** carte ignote, al turn **46**. Flop→river = 1 − (47−o)/47 · (46−o)/46.

| Outs | Progetto | Turn (o/47) | River (o/46) | Flop→river |
|-----:|----------|------------:|-------------:|-----------:|
| 4  | Incastro | 8,51 % | 8,70 % | 16,47 % |
| 8  | Bilaterale | 17,02 % | 17,39 % | 31,45 % |
| 9  | Colore | 19,15 % | 19,57 % | 34,97 % |
| 12 | Colore + incastro | 25,53 % | 26,09 % | 44,96 % |
| 15 | Colore + bilaterale | 31,91 % | 32,61 % | 54,12 % |

Doppi conteggi tolti correttamente: colore + incastro = 9 + 4 − 1 = 12; colore + bilaterale = 9 + 8 − 2 = 15. ✔

### 6. Regola rapida ×2 / ×4: IMPRECISO

Il foglio dice che è "meno precisa con molti outs", che è vero, ma non dà la correzione:

| Outs | ×4 | Esatto | Scarto | ×4 − (outs − 8) |
|-----:|---:|-------:|-------:|----------------:|
| 9  | 36 % | 34,97 % | +1,0 | 35 % |
| 12 | 48 % | 44,96 % | +3,0 | 44 % |
| 15 | 60 % | 54,12 % | **+5,9** | 53 % |

**Correzione proposta (nell'app):** sopra gli 8 outs usare "outs × 4 − (outs − 8)", che con 15 outs sbaglia
di 1 punto invece che di 6. L'app comunque mostrerà sempre il valore esatto.

### 7. EV del call e calcolatore: OK

EV(call) = e·(P + 2B) − B, misurato rispetto al fold (EV 0). È equivalente a e·(P + B) − (1 − e)·B.
Esempio del foglio (P = 100, B = 50, e = 30 %): equity minima 50/200 = **25 %**, EV = 0,30·200 − 50 = **+10** → "EV positivo". ✔
Le validazioni degli input (B > 0, 0 ≤ e ≤ 1) sono corrette. Limite dichiarato correttamente: vale per all-in
o river, senza puntate future né ICM.

### 8. Esempio del progetto colore: OK

Mezzo piatto → prezzo 0,5/(1 + 1) = **25 %**. Colore al turn: 9/47 = **19,1 %**. Entro il river: **35,0 %**.
La conclusione è giusta: il 35 % vale solo se vedi entrambe le carte allo stesso prezzo (cioè sei all-in).
Altrimenti servono implied odds o equity aggiuntiva (overcard, fold equity).

### 9. Stack effettivo: OK

min(1200, 1800) / 100 = **12 BB**, il tuo stack è 12 BB. ✔
**Aggiunta per l'app:** con ante il piatto iniziale è più grande. Mostrerò anche il piatto iniziale in BB
e il valore "M" (stack / (SB + BB + ante totali)), utile ai tavoli casalinghi con ante.

### 10. ICM a due: OK

Formula del foglio: secondo premio + quota chip × (primo − secondo) = 20 + 1200/3000 × 60 = **44**, all'altro **56**.
L'ho confrontata con un Malmuth-Harville generico scritto da zero: **[44,0 ; 56,0]**, identico. ✔
Anche le frasi "con premi fissi a due il valore è lineare nella quota di chip" e "se paga solo il primo non c'è
premio di rischio" sono corrette: nel modello Malmuth-Harville con un solo premio l'equity è esattamente la
quota di chip. Verifica: stack 5000/3000/2000, winner-take-all 100 → 50 / 30 / 20.

### 11–14. Adattamento delle posizioni al numero di giocatori

**Principio:** in un'apertura (tutti hanno foldato) ciò che conta è **quanti giocatori restano dietro di te**.
Il bottone ne ha 2 dietro (SB, BB) a qualsiasi tavolo. Con 8 giocatori:

| Posizione (8 giocatori) | UTG | UTG+1 | LJ | HJ | CO | BTN | SB |
|---|---|---|---|---|---|---|---|
| Giocatori dietro | 7 | 6 | 5 | 4 | 3 | 2 | 1 |

Con N giocatori i posti hanno N−1, N−2, …, 1 giocatori dietro. Quindi **si tolgono (o si aggiungono) sempre i
posti più early**, cioè quelli all'inizio. Con questo criterio verifico la riga del foglio (cella `Range e Sizes!B33`):

| N | Il foglio dice | Posti corretti (dal primo a parlare) | Esito |
|---|---|---|---|
| 10 | (non trattato) | nuovo posto (9 dietro), nuovo posto (8 dietro), poi UTG … SB | **MANCANTE** |
| 9 | "aggiungi UTG+2, usando UTG+1 come base" | nuovo posto (8 dietro, più stretto di UTG), poi UTG, UTG+1, LJ, HJ, CO, BTN, SB | **ERRORE** |
| 8 | base | UTG, UTG+1, LJ, HJ, CO, BTN, SB | OK |
| 7 | "elimina UTG+1" | **UTG+1**, LJ, HJ, CO, BTN, SB (si elimina **UTG**) | **ERRORE** |
| 6 | "elimina UTG e UTG+1" | LJ, HJ, CO, BTN, SB | OK |
| 5 | "parti da HJ" | HJ, CO, BTN, SB | OK |
| 4 | "CO" | CO, BTN, SB | OK |
| 3 | "BTN" | BTN, SB | OK |
| 2 | "sezione heads-up" | SB/BTN vs BB | OK |

- **7 giocatori: il tuo sospetto è giusto.** Il primo a parlare ha 6 giocatori dietro, come UTG+1 a 8.
  Eliminare UTG+1 gli fa usare il range UTG (pensato per 7 dietro) e salta un gradino. La regola è anche
  incoerente con quella per 6 giocatori. L'errore è "prudente" (si gioca più stretto del necessario, circa
  9 % invece di 12 %), quindi costa poco, ma resta un errore.
  **Correzione:** "7 → elimina UTG".
- **9 giocatori: anche qui c'è un errore.** Il posto in più va **prima** di UTG: il primo a parlare ha 8
  giocatori dietro e deve giocare **più stretto** del range UTG a 8. La regola del foglio inserisce invece
  UTG+2 in mezzo e lascia UTG e UTG+1 con i range da 8 giocatori. Così il primo posto (8 dietro) usa il range
  da 7 dietro e il secondo (7 dietro) quello da 6 dietro: i primi due posti risultano un gradino troppo larghi.
  UTG+2, con 6 dietro, è l'unico che riceve il range giusto (quello di UTG+1 a 8).
  **Correzione:** a 9 giocatori il primo posto usa un range "UTG 9" più stretto (proposta: 77+, ATs+, KQs, AJo+, KQo:
  48 + 16 + 4 + 36 + 12 = 116 combo = 8,7 %), il secondo usa il range UTG a 8 e il terzo il range UTG+1 a 8.
- **10 giocatori:** non trattato, ma l'app deve coprire 2–10 giocatori. **Correzione:** due posti prima di UTG
  ("UTG 10": 88+, ATs+, KQs, AQo+ = 42 + 16 + 4 + 24 = 86 combo = 6,5 %; "UTG 9" come sopra).
- Nell'app le posizioni saranno quindi generate in automatico a partire dal numero di giocatori, col criterio
  "giocatori dietro", e i nomi seguiranno la convenzione corrente (UTG, UTG+1, UTG+2, LJ, HJ, CO, BTN, SB, BB).

---

## B. Scelte discutibili (strategia)

Riferimento: soluzioni pubbliche da solver per MTT a 8 giocatori, 40 BB, con ante (GTO Wizard, charts MTT
diffusi). Le cifre sono ordini di grandezza, non valori esatti, perché cambiano con ante, struttura e size.

### 15. Ampiezza dei range di apertura: DISCUTIBILE (ma dichiarata)

| Posizione | Foglio | Ordine di grandezza da solver (8 giocatori, ~40 BB, ante) |
|-----------|-------:|----------------------:|
| UTG   | 9,4 %  | ~15–18 % |
| UTG+1 | 11,6 % | ~17–20 % |
| LJ    | 14,8 % | ~20–24 % |
| HJ    | 20,1 % | ~25–29 % |
| CO    | 27,0 % | ~32–37 % |
| BTN   | 40,6 % | ~45–55 % |
| SB    | 30,3 % (solo raise) | ~55–70 % complessivo, raise + limp |

Il foglio lo dice chiaramente ("Base prudente… non frequenze GTO"). In una partita casalinga con amici che
chiamano molto, aprire più stretto e con mani "di valore" è un adattamento sensato, perché il furto dei bui
rende meno e il gioco postflop multiway pesa di più. Quindi **non lo considero un errore**.
**Proposta per l'app:** due profili selezionabili, "Prudente (dal foglio)" e "Standard (vicino ai solver)",
più la possibilità di modificare le celle.

### 16. Composizione: DISCUTIBILE

- **A5s–A2s assenti fino all'HJ.** Nei solver A5s/A4s si aprono già da UTG, prima di A9s/A8s, perché bloccano
  gli assi e fanno scala e colore. Nell'LJ è incluso A7s ma non A5s. Proposta: in UTG+1 e LJ sostituire
  A9s/A8s con A5s/A4s, o aggiungerli.
- **SB solo raise.** Le teorie attuali giocano la SB vs BB con una strategia mista di limp e raise. Il foglio lo
  cita a parole ("Il limp può essere un'alternativa"); l'app avrà una nota esplicita.

### 17. Size: OK, con una riserva

- Open 2–2,5 BB, isolamento "open + 1 BB per limper", c-bet 25–33 % su board secchi e 50–75 % su board dinamici,
  SB 3–4 BB: **OK**, in linea con la pratica corrente. Al tavolo casalingo, contro chi chiama tutto, aprire più
  grande (3 BB o più) è un adattamento legittimo: lo aggiungo come nota.
- 3-bet in posizione circa 3× (esempio 2 → 6–7 BB): **OK**.
- **3-bet fuori posizione 4–5×: DISCUTIBILE a 40 BB.** Su un'apertura da 2,5 BB, 5× vuol dire 12,5 BB, quasi un
  terzo dello stack: a quel punto lo shove è spesso migliore. Proposta: ~4× (3,5–4,5×) a 40 BB e oltre; sotto i
  ~25 BB, 3-bet shove o fold.

### 18. Push-fold: IMPRECISO (corretto ma solo qualitativo)

Le frasi sono corrette (shove e call sono decisioni diverse, contano lo stack esatto e la posizione, non esiste
un range unico sotto i 10 BB, attenzione a "chiama sempre con 22+"), ma **non ci sono range numerici**.
Inoltre i range di Nash dipendono molto dall'**ante**: senza ante, a 10 BB il bottone spinge circa il 40 % delle
mani; con ante più largo.
**Per l'app:** calcolerò io l'equilibrio di Nash heads-up (SB push / BB call) per 1–20 BB, con e senza ante, e
lo userò come riferimento. Al tavolo pieno userò approssimazioni dichiarate come tali (vedi "Da aggiungere").

### 19. ICM, accordi, heads-up: OK

- "Con almeno 3 giocatori e più posti pagati le chip non sono lineari" e "un call marginale in chip può perdere
  valore": **OK**.
- "Uno split concordato non è automaticamente un deal ICM": **OK**.
- Heads-up: "il BTN/SB agisce per primo preflop e per ultimo dopo il flop": **OK**. "Gioca sensibilmente più mani":
  **OK** (in heads-up a 20–40 BB i solver aprono l'80–90 % dal bottone). Manca un range concreto: lo metterò
  nell'app come approssimazione.

### 20. Lettura avversari: OK

I consigli sono qualitativi e prudenti (osservazioni concrete, nessuna etichetta definitiva). Non c'è nulla di
scorretto. Diventeranno le schede profilo e le note dell'app.

### Piccole imprecisioni di forma

- `Range e Sizes!E41` (riga "AJo, KQo e altri broadway") nomina AQo, che però sta nella riga sopra. Innocuo.
- `B29` dice "I connettori sono elencati uno per uno", ma le liste usano anche `T6s+`, `J8s+`, `T8s+`. Non è un
  errore: `+` vale per i non-coppia secondo la regola scritta. Va solo chiarito.
- L'origine indicata è "POKER STRATGY.xlsx" (refuso). Irrilevante.

---

## 21. Fonti citate

Il foglio cita 8 pagine di PokerStars Learn / Help. Ho provato a leggerle:

- 7 pagine `pokerstars.com/poker/learn/...` (bet sizing, 3-bet, pot odds, outs, push or fold, ICM, heads-up):
  il server risponde con un **loop di redirect**, e il browser integrato blocca il dominio. **Non verificabili**
  da qui. Puoi aprirle tu nel tuo browser; ti segnalo che i contenuti PokerStars sono didattici di base, non
  output di solver.
- `pokerstars.com/help/articles/trn-deal-explanations/`: **letta**. Descrive due tipi di accordo, "ICM deal"
  (valore monetario dagli stack e dalla struttura dei premi) ed "equal split". È coerente con quanto scritto nel
  foglio (la pagina non specifica il modello, ma lo standard è Malmuth-Harville).

Al posto delle fonti non raggiungibili ho verificato la **matematica in modo indipendente** (tutto ricalcolato
qui sopra). Per la strategia mi sono confrontato con la teoria corrente da solver, in forma di ordini di
grandezza e con l'indicazione esplicita di cosa è approssimato.

---

## Da aggiungere nell'app (non nel foglio)

1. **Posizioni generate dal numero di giocatori (2–10)** con il criterio "giocatori dietro", correzioni 7/9/10 incluse.
2. **Fasce di stack:** 40+ BB (range del foglio), 20–40 BB (range ristretti: meno mani speculative tipo
   suited connector bassi e coppie piccole in early, segnalati come approssimazione), 10–20 BB (open più
   stretto + range di reshove), sotto 10 BB (push/fold).
3. **Push/fold di Nash heads-up calcolato** (SB push / BB call, 1–20 BB, ante sì/no). Al tavolo pieno: range di
   shove approssimati per posizione e stack, contrassegnati come approssimazione.
4. **Profilo range "Standard"** accanto a quello "Prudente" del foglio, più l'editor delle celle.
5. **Regola ×4 corretta** (outs × 4 − (outs − 8)) accanto al valore esatto.
6. **M-ratio e piatto iniziale con ante.**
7. **ICM a N giocatori** (Malmuth-Harville), con controllo sul caso a 2 (= formula del foglio).
8. **Avvertenze contestuali:** implied odds, ICM vicino ai premi, limp in SB, 3-bet OOP a stack medi.
9. **Range heads-up** approssimati (BTN ~80–90 % a 20–40 BB; difesa BB ampia).
