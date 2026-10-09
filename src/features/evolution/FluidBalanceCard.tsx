import type { FluidBalance } from '../../db/types';
import { fluidSummary, INTAKE_FIELDS, OUTPUT_FIELDS, signedMl } from '../../clinical/evolution';
import { NumberField } from '../../components/ui/TextField';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { formatNumber } from '../../lib/format';

/* Balanço hídrico do período + débito urinário (mL/kg/h). */

const EMPTY: FluidBalance = { intake: {}, output: {}, hours: 24 };

export function FluidBalanceCard({ value, onChange, weight }: { value: FluidBalance | undefined; onChange: (f: FluidBalance) => void; weight?: number }) {
  const f = value ?? EMPTY;
  const s = fluidSummary(f, weight);
  const setIn = (k: keyof FluidBalance['intake'], n: number | undefined) => onChange({ ...f, intake: { ...f.intake, [k]: n } });
  const setOut = (k: keyof FluidBalance['output'], n: number | undefined) => onChange({ ...f, output: { ...f.output, [k]: n } });

  return (
    <div className="card stack gap-3">
      <div className="row between">
        <strong className="t-headline">Balanço hídrico</strong>
        <div style={{ minWidth: 168 }}>
          <SegmentedControl
            ariaLabel="Período do balanço"
            value={String(f.hours) as '24' | '12' | '6'}
            onChange={(h) => onChange({ ...f, hours: Number(h) })}
            options={[
              { value: '24', label: '24 h' },
              { value: '12', label: '12 h' },
              { value: '6', label: '6 h' },
            ]}
          />
        </div>
      </div>

      <div className="fluid-cols">
        <fieldset className="fluid-col">
          <legend className="field-label">Entradas (mL)</legend>
          {INTAKE_FIELDS.map((x) => (
            <NumberField key={x.key} label={x.label} decimals={0} unit="mL" value={f.intake[x.key]} onChange={(n) => setIn(x.key, n)} />
          ))}
        </fieldset>
        <fieldset className="fluid-col">
          <legend className="field-label">Saídas (mL)</legend>
          {OUTPUT_FIELDS.map((x) => (
            <NumberField key={x.key} label={x.label} decimals={0} unit="mL" value={f.output[x.key]} onChange={(n) => setOut(x.key, n)} />
          ))}
        </fieldset>
      </div>

      {s && (
        <div className="fluid-summary" aria-live="polite">
          <div>
            <span className="c-secondary t-footnote">Entradas</span>
            <strong>{formatNumber(s.intake, 0)} mL</strong>
          </div>
          <div>
            <span className="c-secondary t-footnote">Saídas</span>
            <strong>{formatNumber(s.output, 0)} mL</strong>
          </div>
          <div>
            <span className="c-secondary t-footnote">Balanço</span>
            <strong>{signedMl(s.balance)}</strong>
          </div>
        </div>
      )}
      {s?.urineRate !== undefined ? (
        <p className="row gap-2 t-subhead">
          <span className="tag" data-tone={s.oliguria ? 'red' : 'green'}>
            {formatNumber(s.urineRate, 2)} mL/kg/h
          </span>
          <span className={s.oliguria ? 'c-red' : 'c-secondary'}>
            {s.oliguria ? 'Oligúria (< 0,5 mL/kg/h — critério de débito urinário do KDIGO)' : 'Débito urinário'}
          </span>
        </p>
      ) : (
        f.output.diurese !== undefined && !weight && <p className="t-footnote c-secondary">Informe o peso para calcular a diurese em mL/kg/h.</p>
      )}
    </div>
  );
}
