import { useAppState, setState, getState, replaceState, defaultState } from '../state.ts';
import { wakeLockSupported } from '../wakelock.ts';

export function SettingsScreen() {
  const s = useAppState();
  const toggle = (k: 'wakeLock' | 'discreet', label: string, hint: string) => (
    <label class="row card" style={{ cursor: 'pointer' }}>
      <input type="checkbox" style={{ width: '24px', height: '24px' }} checked={s.settings[k]} onChange={(e) => setState((x) => { x.settings[k] = (e.target as HTMLInputElement).checked; })} />
      <span class="grow"><b>{label}</b><div class="tiny muted">{hint}</div></span>
    </label>
  );

  const exportData = () => {
    const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tavolo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const importData = (f: File | undefined) => {
    if (!f) return;
    f.text().then((t) => {
      try {
        const data = JSON.parse(t);
        if (data?.v !== 1 || !data.config) throw new Error();
        if (confirm('Sostituire i dati attuali con quelli del backup?')) replaceState({ ...defaultState(), ...data });
      } catch { alert('File di backup non valido.'); }
    });
  };

  return (
    <div>
      {toggle('wakeLock', 'Schermo sempre acceso', wakeLockSupported() ? 'Mentre l\'app è aperta lo schermo non si spegne.' : 'Questo browser non supporta il blocco dello schermo acceso.')}
      {toggle('discreet', 'Modalità discreta', 'Colori spenti e luminosità ridotta, per dare meno nell\'occhio al tavolo.')}

      <h3>Backup</h3>
      <div class="card">
        <p class="small muted" style={{ marginTop: 0 }}>I dati (torneo, range modificati, note, timer) restano solo su questo telefono. Esporta un backup ogni tanto: se il browser cancella i dati, lo reimporti.</p>
        <div class="row">
          <button type="button" class="btn grow" onClick={exportData}>Esporta</button>
          <label class="btn grow" style={{ cursor: 'pointer' }}>Importa<input type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={(e) => importData((e.target as HTMLInputElement).files?.[0])} /></label>
        </div>
        <button type="button" class="btn ghost danger block mt" onClick={() => { if (confirm('Cancellare tutti i dati dell\'app su questo telefono?')) replaceState(defaultState()); }}>Cancella tutti i dati</button>
      </div>

      <h3>Installa sul telefono</h3>
      <div class="card small">
        <p style={{ marginTop: 0 }}><b>Android (Chrome):</b> menu ⋮ in alto a destra → <i>Aggiungi a schermata Home</i> (o <i>Installa app</i>) → Installa.</p>
        <p><b>iPhone (Safari):</b> pulsante Condividi (quadrato con freccia) → <i>Aggiungi alla schermata Home</i> → Aggiungi.</p>
        <p class="muted" style={{ marginBottom: 0 }}>Dopo la prima apertura l'app funziona anche senza internet.</p>
      </div>

      <h3>Informazioni</h3>
      <div class="card tiny muted">
        Strumento di studio e consultazione per tornei casalinghi. I range "Prudente" vengono dal foglio Poker_Tornei.xlsx validato; ciò che è segnato con ≈ è un'approssimazione calcolata o derivata. Nessun dato lascia il telefono.
      </div>
    </div>
  );
}
