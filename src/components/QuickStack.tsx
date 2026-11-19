// Pannello rapido per aggiornare il proprio stack (si apre toccando lo stack nella barra in alto).
import { useAppState, setState, derive, fmtNum, fmtChips, type Unit } from '../state.ts';
import { Modal, NumField, Seg } from './ui.tsx';
import { bandFor } from '../engine/openRanges.ts';

export function QuickStack({ onClose }: { onClose: () => void }) {
  const s = useAppState();
  const d = derive(s);
  const bb = d.level.bb || 1;
  const unit = s.settings.unit;
  const inBB = unit === 'bb';
  const my = s.config.myStack;
  const set = (chips: number) => setState((x) => { x.config.myStack = Math.max(0, Math.round(chips)); });
  const add = (bbs: number) => set(my + bbs * bb);
  const band = bandFor(d.effBB);

  return (
    <Modal title="Il mio stack" onClose={onClose}>
      <div class="center mb">
        <div style={{ fontSize: '40px', fontWeight: 800, lineHeight: 1.1 }}>{inBB ? `${fmtNum(my / bb)} BB` : fmtChips(my)}</div>
        <div class="small muted">{inBB ? `${fmtChips(my)} fiches` : `${fmtNum(my / bb)} BB`} · bui {fmtChips(d.level.sb)}/{fmtChips(bb)} · <span class={'zone ' + band.id}>{band.nome}</span></div>
      </div>
      <div class="mb"><Seg value={unit} onChange={(u: Unit) => setState((x) => { x.settings.unit = u; })} options={[{ v: 'bb', l: 'Mostra in BB' }, { v: 'chips', l: 'Mostra in fiches' }]} /></div>

      <div class="qs-grid">
        {[-10, -5, -1, 1, 5, 10].map((v) => (
          <button type="button" key={v} class={'btn ' + (v < 0 ? 'qs-minus' : 'qs-plus')} onClick={() => add(v)}>{v > 0 ? '+' : '−'}{Math.abs(v)} BB</button>
        ))}
      </div>
      <div class="qs-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <button type="button" class="btn qs-minus" onClick={() => set(my / 2)}>Ho perso metà</button>
        <button type="button" class="btn qs-plus" onClick={() => set(my * 2)}>Ho raddoppiato</button>
        <button type="button" class="btn" onClick={() => set(my + s.config.startingStack)}>+ Rebuy</button>
        <button type="button" class="btn" onClick={() => set(s.config.startingStack)}>= Iniziale</button>
      </div>

      <NumField label={`Oppure scrivi il valore esatto (${inBB ? 'BB' : 'fiches'})`} value={inBB ? Math.round((my / bb) * 10) / 10 : my} step={inBB ? 1 : bb}
        onChange={(v) => set(inBB ? v * bb : v)} />
      <p class="tiny muted">Lo stack non si aggiorna da solo: l'app non vede le fiches. I BB invece scendono da soli quando salgono i bui. Aggiornalo dopo un piatto grosso e a ogni cambio di livello (te lo ricorda l'app).</p>
      <button type="button" class="btn primary block" onClick={onClose}>Fatto</button>
    </Modal>
  );
}
