import guida from '../data/guida.json';
import spiegazioni from '../data/spiegazioni.json';
import esempi from '../data/esempi.json';

export function Guide() {
  const sec = (title: string, items: { t: string; d: string; v?: string }[]) => (
    <details class="card">
      <summary>{title}</summary>
      {items.map((g) => <p key={g.t} class="small"><b>{g.t}</b>{g.v ? <> · <span class="warn">{g.v}</span></> : null} — {g.d}</p>)}
    </details>
  );
  return (
    <div>
      <details class="card" open>
        <summary>Esempi passo passo</summary>
        {esempi.sezioni.map((s) => (
          <details key={s.scheda} style={{ borderTop: '1px solid var(--line)' }}>
            <summary><b style={{ color: 'var(--text)' }}>{s.scheda}</b>&nbsp;<span class="tiny">({s.esempi.length})</span></summary>
            {s.esempi.map((e) => (
              <div key={e.titolo} class="info-box">
                <p><b>{e.titolo}</b></p>
                <p class="ex"><b>Situazione:</b> {e.situazione}</p>
                <ol style={{ margin: '0 0 8px', paddingLeft: '20px' }}>{e.passi.map((p, i) => <li key={i} style={{ marginBottom: '4px' }}>{p}</li>)}</ol>
                <p><b>Cosa vedi:</b> {e.risultato}</p>
                <p class="tip"><b>Cosa impari:</b> {e.impari}</p>
              </div>
            ))}
          </details>
        ))}
      </details>
      <details class="card">
        <summary>Glossario: cos'è…?</summary>
        {Object.entries(spiegazioni.voci).map(([id, v]) => (
          <details key={id} style={{ borderTop: '1px solid var(--line)' }}>
            <summary>{v.titolo}</summary>
            <div class="info-box">
              {v.testo.map((t, i) => <p key={i}>{t}</p>)}
              <p class="ex"><b>Esempio:</b> {v.esempio}</p>
              <p class="tip"><b>Al tavolo:</b> {v.alTavolo}</p>
            </div>
          </details>
        ))}
      </details>
      {sec('Prima di ogni decisione', guida.primaDiOgniDecisione)}
      {sec('Se qualcuno ha già rilanciato', guida.controRaise)}
      {sec('Size di partenza', guida.size)}
      {sec('Postflop', guida.postflop)}
      {sec('Stack corti e push/fold', guida.pushFold)}
      {sec('Heads-up', guida.headsUp)}
      <details class="card">
        <summary>ICM e accordi</summary>
        {guida.icm.map((t, i) => <p key={i} class="small">{t}</p>)}
      </details>
      <details class="card">
        <summary>Formule</summary>
        <p class="small"><b>Equity minima per chiamare</b> = B / (P + 2B), con P piatto prima della puntata B. Al tavolo: da chiamare / (piatto al centro + da chiamare).</p>
        <p class="small"><b>Fold necessari a un bluff</b> = B / (P + B).</p>
        <p class="small"><b>EV del call</b> = equity × piatto finale − costo del call.</p>
        <p class="small"><b>Outs</b>: turn = outs/47, river = outs/46, entro il river = 1 − (47−o)/47 × (46−o)/46. Regola rapida: ×2 per una carta, ×4 per due (sopra 8 outs: ×4 − (outs − 8)).</p>
        <p class="small"><b>Combinazioni</b>: coppia 6, suited 4, offsuit 12, totale 1326.</p>
        <p class="small"><b>Posizioni</b>: il range dipende da quanti giocatori restano dietro. Con meno giocatori si tolgono i posti più early (a 7 si elimina UTG).</p>
      </details>
    </div>
  );
}
