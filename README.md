# PokerAssistant: assistente per tornei casalinghi di Texas Hold'em

App online: <https://nello209.github.io/PokerAssistant/>

App per il telefono (PWA) da tenere aperta al tavolo. Funziona **senza internet** dopo la prima apertura,
non ha server né login, e tutti i dati restano sul telefono.

Ogni sezione ha un pulsante **ⓘ Cos'è?** con una spiegazione semplice e un esempio. In *Altro → Guida*
ci sono gli **esempi passo passo** di ogni funzione (con i numeri che l'app calcola davvero) e un glossario completo.

| Scheda | A cosa serve |
|---|---|
| **Barra in alto** | Livello, bui, il tuo stack, stack effettivo, M, fascia di stack. A sinistra (⚙) apri la configurazione; tocca lo stack (✎) per **aggiornarlo al volo** (±BB, raddoppiato, metà, rebuy); il pulsante **BB⇄** passa da BB a fiches. A ogni nuovo livello compare un promemoria per controllare lo stack. |
| **Configurazione: Struttura** | Partecipanti, stack iniziale, durata massima (1–6 ore), **rebuy previsti**, ante facoltative (nessuna / a testa / BB ante), durata dei livelli → l'app **genera la struttura dei bui** con orari, bui arrotondati a valori comodi e livelli di riserva. |
| **Configurazione: In gioco** | Livello attuale (o lo aggiorna il timer), giocatori ancora al tavolo, il tuo stack e quello degli avversari in BB o fiches. |
| **Preflop** | Scegli il tuo posto toccandolo su un **tavolo disegnato** (con il bottone D); "Mano dopo ⟳" sposta la posizione di un posto. Range di apertura 13×13 per la tua posizione, adattato al numero di giocatori e allo stack. Profili Prudente (dal foglio Excel) e Standard. Celle modificabili. Sotto i 10 BB passa da solo al push/fold. |
| **Mano** | Selettore carte rapido → "Cosa ho", outs puliti con percentuali, equity contro 1–9 avversari (mano precisa, range o casuale), pot odds con verdetto CALL +EV / FOLD. |
| **Push/Fold** | Range di shove e di call contro shove calcolati con l'equilibrio di Nash (heads-up esatto nel modello, tavolo pieno approssimato). |
| **ICM** | Valore in premi degli stack (Malmuth-Harville), chip chop e divisione uguale, per gli accordi finali. |
| **Altro** | Note sugli avversari per profilo, timer dei bui condivisibile con QR, SPR e size rapide, guida, impostazioni e backup. |

Schermo sempre acceso (Wake Lock), tema scuro, modalità discreta, nome e icona neutri.

---

## 1. Avviarla sul computer

Serve [Node.js](https://nodejs.org) (versione 22 o successiva). Nella cartella del progetto:

```powershell
npm install
```

```powershell
npm run dev
```

Apri l'indirizzo che compare (es. `http://localhost:5173`). Con `--host` (già impostato) compare anche un
indirizzo tipo `http://192.168.1.x:5173`: aprendolo dal telefono connesso **alla stessa rete Wi-Fi** puoi
provare l'app sul telefono. Per l'installazione vera serve però la pubblicazione (punto 3), perché le PWA
richiedono HTTPS.

Altri comandi utili:

```powershell
npm test
```
Esegue gli 86 test automatici: valutatore delle mani su tutte le 133.784.560 mani da 7 carte, equity (AA vs KK ≈ 82%),
formule della Fase 1, ICM, posizioni, push/fold, generatore della struttura dei bui (375 scenari), spiegazioni ed esempi passo passo.

```powershell
npm run build
```
Crea la versione finale nella cartella `dist/`.

---

## 2. Dove sono le cose

```
src/data/          ← DATI, modificabili senza toccare il codice
  ranges.json        range di apertura (Prudente dal foglio, Standard, heads-up, fasce di stack)
  guida.json         consigli e avvertenze (dal foglio, corretti come in VALIDAZIONE.md)
  spiegazioni.json   testi dei pulsanti "Cos'è?"
  avversari.json     profili avversari
  preflop-equity.json  equity 169×169 calcolata (rigenerabile con: npm run gen:equity)
src/engine/        ← calcoli: valutatore, equity, outs, pot odds, ICM, push/fold, posizioni, struttura dei bui
src/worker/        ← Web Worker: i calcoli pesanti non bloccano l'interfaccia
src/screens/       ← schermate
tests/             ← test automatici
VALIDAZIONE.md     ← verifica del file Excel (Fase 1)
```

Notazione dei range: `77+` (77 fino ad AA), `ATs+` (ATs, AJs, AQs, AKs), `A5s-A2s`, `KQo`, separati da `;`.

---

## 3. Pubblicarla gratis su GitHub Pages

GitHub è un sito che conserva il codice; **GitHub Pages** lo trasforma gratis in un sito web con indirizzo
`https://TUO-NOME.github.io/PokerAssistant/`. Una volta configurato, ogni aggiornamento viene ripubblicato da solo.

**Cosa fai tu (una volta sola):**

1. **Crea un account** su <https://github.com/signup> (gratuito). Il nome utente farà parte dell'indirizzo
   dell'app: scegline uno che ti va bene vedere.
2. **Crea un repository vuoto**: in alto a destra **+** → **New repository**.
   - *Repository name*: `PokerAssistant` (o un altro nome: sarà l'ultima parte dell'indirizzo).
   - Scegli **Public**: con l'account gratuito GitHub Pages funziona solo con repository pubblici. Vuol dire che
     il codice e i range sono visibili a chi conosce l'indirizzo; il file Excel e i tuoi dati personali (note, stack)
     **non** vengono caricati.
   - **Non** spuntare "Add a README" né altre opzioni → **Create repository**.
3. **Attiva Pages**: nel repository, **Settings** → **Pages** (menu a sinistra) → in *Build and deployment*,
   *Source* = **GitHub Actions**.
4. Dimmi il nome utente e il nome del repository: carico io il codice. Al primo invio si apre una finestra del
   browser per **accedere a GitHub e autorizzare** "Git Credential Manager": serve perché il tuo computer possa
   caricare file sul tuo account. Accetta.

**Cosa faccio io** (per riferimento, sono questi comandi):

```powershell
git remote add origin https://github.com/TUO-NOME/PokerAssistant.git
```

```powershell
git push -u origin main
```

Dopo 1–2 minuti, nella scheda **Actions** del repository compare un segno verde e l'app è online su
`https://TUO-NOME.github.io/PokerAssistant/`. Se compare una ✕ rossa, aprila: di solito vuol dire che al punto 3
non era stato scelto "GitHub Actions".

---

## 4. Installarla sul telefono

Apri l'indirizzo dell'app **una volta con internet**, poi:

**Android (Chrome)**
1. Apri l'indirizzo in **Chrome**.
2. Tocca il menu **⋮** in alto a destra → **Aggiungi a schermata Home** (oppure **Installa app**).
3. Conferma con **Installa**. Compare l'icona "PokerAssistant" (una piccola griglia dorata) fra le app.

**iPhone (Safari)**: deve essere Safari, non Chrome.
1. Apri l'indirizzo in **Safari**.
2. Tocca il pulsante **Condividi** (il quadrato con la freccia verso l'alto, in basso al centro).
3. Scorri e tocca **Aggiungi alla schermata Home** → **Aggiungi**.

Da quel momento si apre a schermo intero come un'app e **funziona anche offline** (modalità aereo compresa).
Gli aggiornamenti arrivano da soli la prima volta che la apri con internet.

**Schermo sempre acceso:** su Android funziona subito; su iPhone serve iOS 16.4 o successivo. Si attiva o
disattiva in *Altro → Impostazioni*.

**Backup:** i dati restano solo sul telefono. Se cancelli i dati del browser o disinstalli l'app li perdi.
Usa *Altro → Impostazioni → Esporta* ogni tanto.

---

## 5. Cosa è calcolato e cosa è approssimato

- **Esatti**: valutatore dei punti, outs, pot odds, EV, ICM, combinazioni. L'equity è esatta quando i casi sono
  pochi; altrimenti è Monte Carlo con il margine d'errore indicato a schermo.
- **Range Prudente 40+ BB**: dal foglio Excel, verificati mano per mano (VALIDAZIONE.md), con le posizioni corrette
  per 7, 9 e 10 giocatori.
- **Approssimazioni (segnate con ≈ nell'app)**: profilo Standard, fasce 20–40 e 10–20 BB, range heads-up,
  push/fold con più di 2 giocatori (si considera un solo chiamante). Il push/fold heads-up è l'equilibrio di Nash
  esatto nel modello chip-EV.
- Nessun calcolo tiene conto della tua abilità o di quella degli avversari: sono punti di partenza, non ordini.
