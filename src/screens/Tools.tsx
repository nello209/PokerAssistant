import { useState } from 'preact/hooks';
import { useAppState, derive, fmtNum, fmtChips } from '../state.ts';
import { NumField } from '../components/ui.tsx';
import { SecHead } from '../components/Info.tsx';
import { spr, bluffFoldNeeded, requiredEquity } from '../engine/odds.ts';

export function Tools() {
  const s = useAppState();
  const d = derive(s);
  const bb = d.level.bb || 1;
  const [openBB, setOpenBB] = useState(2.5);
  const [limpers, setLimpers] = useState(0);
  const [pot, setPot] = useState(0);
  const [eff, setEff] = useState(Math.round(d.effStack));
  const sprV = pot > 0 ? spr(eff, pot) : null;

  return (
    <div>
      <div class="card">
        <SecHead label={`Size preflop (bui ${fmtNum(d.level.sb, 0)}/${fmtNum(bb, 0)})`} info="size" />
        <div class="row">
          <div class="grow"><NumField label="Open (BB)" value={openBB} step={0.25} min={1} onChange={setOpenBB} /></div>
          <div class="grow"><NumField label="Limper" value={limpers} min={0} max={8} onChange={setLimpers} /></div>
        </div>
        <table class="t">
          <tbody>
            <tr><td>Open raise</td><td>{fmtNum(openBB + limpers, 2)} BB</td><td><b>{fmtChips((openBB + limpers) * bb)}</b></td></tr>
            <tr><td>3-bet in posizione (~3×)</td><td>{fmtNum((openBB + limpers) * 3, 1)} BB</td><td><b>{fmtChips((openBB + limpers) * 3 * bb)}</b></td></tr>
            <tr><td>3-bet fuori posizione (~4×)</td><td>{fmtNum((openBB + limpers) * 4, 1)} BB</td><td><b>{fmtChips((openBB + limpers) * 4 * bb)}</b></td></tr>
            <tr><td>Open SB vs BB (~3 BB)</td><td>3 BB</td><td><b>{fmtChips(3 * bb)}</b></td></tr>
          </tbody>
        </table>
        <div class="tiny muted mt">Isolamento: open + 1 BB per limper. Se il 3-bet supera ~1/3 del tuo stack valuta lo shove.</div>
      </div>

      <div class="card">
        <SecHead label="Postflop: SPR e puntate" info="spr" />
        <div class="row">
          <div class="grow"><NumField label="Piatto (fiches)" value={pot} step={bb} onChange={setPot} /></div>
          <div class="grow"><NumField label="Stack effettivo" value={eff} step={bb} onChange={setEff} /></div>
        </div>
        {sprV !== null && (
          <>
            <div class="row mb"><span class="grow">SPR</span><b style={{ fontSize: '24px' }}>{fmtNum(sprV, 1)}</b></div>
            <div class="small mb muted">{sprV < 3 ? 'SPR basso: con top pair o progetti forti spesso si va all-in.' : sprV <= 6 ? 'SPR medio: top pair forte va bene per buona parte dello stack, rivaluta su raise.' : 'SPR alto: servono mani forti (doppia coppia, set o meglio) per mettere tutto lo stack.'}</div>
            <table class="t">
              <thead><tr><th>Puntata</th><th>Fiches</th><th>Equity min. a chi chiama</th><th>Fold necessari al bluff</th></tr></thead>
              <tbody>
                {[0.25, 0.33, 0.5, 0.66, 0.75, 1].map((f) => (
                  <tr key={f}><td>{Math.round(f * 100)}%</td><td><b>{fmtChips(pot * f)}</b></td><td>{fmtNum(requiredEquity(1, f) * 100)}%</td><td>{fmtNum(bluffFoldNeeded(1, f) * 100)}%</td></tr>
                ))}
              </tbody>
            </table>
            <div class="tiny muted mt">25–33% su board secchi con vantaggio di range; 50–75% su board dinamici o range polarizzati. In multiway riduci i bluff.</div>
          </>
        )}
      </div>

      <div class="card">
        <SecHead label="Il tuo stack" info="barra" />
        <div class="kv">
          <span>Stack</span><b>{fmtChips(s.config.myStack)} ({fmtNum(d.myBB)} BB)</b>
          <span>Stack effettivo</span><b>{fmtChips(d.effStack)} ({fmtNum(d.effBB)} BB)</b>
          <span>Piatto iniziale (bui + ante)</span><b>{fmtChips(d.level.sb + d.level.bb + d.anteTotal)}</b>
          <span>M (giri prima di finire i bui)</span><b>{fmtNum(d.m)}</b>
        </div>
      </div>
    </div>
  );
}
