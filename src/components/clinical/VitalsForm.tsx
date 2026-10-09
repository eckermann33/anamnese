import type { Vitals } from '../../db/types';
import type { Profile } from '../../clinical/types';
import { classifyVital, meanArterialPressure, shockIndex, VITAL_META, type VitalKey } from '../../clinical/vitals';
import { NumberField } from '../ui/TextField';
import { Toggle } from '../ui/Toggle';
import { formatNumber } from '../../lib/format';

/* Sinais vitais com destaque automático: verde normal, laranja atenção, vermelho crítico. */

interface Props {
  value: Vitals;
  onChange: (v: Vitals) => void;
  ageYears?: number;
  profile: Profile;
  /** Valores anteriores (placeholder) — usado na evolução. */
  previous?: Vitals;
}

const ORDER: VitalKey[] = ['fc', 'fr', 'temp', 'spo2', 'glicemia', 'dor'];

export function VitalsForm({ value, onChange, ageYears, profile, previous }: Props) {
  const ctx = { ageYears, profile };
  const set = (k: keyof Vitals, n: number | boolean | undefined) => onChange({ ...value, [k]: n });

  const pas = classifyVital('pas', value.pas, ctx, value);
  const pad = classifyVital('pad', value.pad, ctx, value);
  const paTone = [pas?.tone, pad?.tone].includes('red') ? 'red' : [pas?.tone, pad?.tone].includes('orange') ? 'orange' : pas || pad ? 'green' : undefined;
  const pam = meanArterialPressure(value);
  const si = shockIndex(value);

  return (
    <div className="vitals-grid">
      <div className="vital-card vital-card-wide" data-tone={paTone}>
        <div className="vital-head">
          <span className="vital-label">PA</span>
          <span className="dot" data-tone={paTone} aria-hidden="true" />
        </div>
        <div className="row gap-2">
          <NumberField
            ariaLabel="PA sistólica"
            value={value.pas}
            onChange={(n) => set('pas', n)}
            decimals={0}
            placeholder={previous?.pas !== undefined ? String(previous.pas) : 'PAS'}
            className="grow"
          />
          <span className="c-secondary t-title3" aria-hidden="true">
            ×
          </span>
          <NumberField
            ariaLabel="PA diastólica"
            value={value.pad}
            onChange={(n) => set('pad', n)}
            decimals={0}
            placeholder={previous?.pad !== undefined ? String(previous.pad) : 'PAD'}
            unit="mmHg"
            className="grow"
          />
        </div>
        <div className="vital-msg">
          {[pas?.message, pad?.message].filter(Boolean).join(' · ') ||
            (pam ? `PAM ${pam} mmHg${si !== undefined ? ` · IC ${formatNumber(si, 2)}` : ''}` : ' ')}
        </div>
      </div>
      {ORDER.map((k) => {
        const meta = VITAL_META[k];
        const st = classifyVital(k, value[k] as number | undefined, ctx, value);
        return (
          <div key={k} className="vital-card" data-tone={st?.tone}>
            <div className="vital-head">
              <span className="vital-label">{meta.short}</span>
              <span className="dot" data-tone={st?.tone} aria-hidden="true" />
            </div>
            <NumberField
              ariaLabel={meta.label}
              value={value[k] as number | undefined}
              onChange={(n) => set(k, n)}
              unit={meta.unit}
              decimals={meta.decimals}
              min={meta.min}
              max={meta.max}
              placeholder={previous?.[k] !== undefined ? formatNumber(previous[k] as number, meta.decimals) : undefined}
            />
            <div className="vital-msg">{st?.message ?? ' '}</div>
            {k === 'spo2' && (
              <label className="row gap-2 t-footnote vital-o2">
                <Toggle checked={!!value.o2} onChange={(c) => set('o2', c)} ariaLabel="Em oxigênio suplementar" />
                Em O₂
              </label>
            )}
          </div>
        );
      })}
    </div>
  );
}
