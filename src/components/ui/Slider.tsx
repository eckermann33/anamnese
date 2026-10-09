import { useId } from 'react';
import { Button } from './Button';

interface ScaleSliderProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  label?: string;
  /** Rótulos das extremidades. */
  minLabel?: string;
  maxLabel?: string;
  /** Colore a barra por gravidade (dor: 0–3 verde, 4–6 laranja, 7–10 vermelho). */
  severity?: boolean;
}

function severityColor(v: number, max: number) {
  const ratio = v / max;
  if (ratio >= 0.7) return 'var(--red)';
  if (ratio >= 0.4) return 'var(--orange)';
  return 'var(--green)';
}

function severityText(v: number, max: number) {
  const ratio = v / max;
  if (v === 0) return 'sem dor';
  if (ratio >= 0.7) return 'intensa';
  if (ratio >= 0.4) return 'moderada';
  return 'leve';
}

/** Escala 0–10 (ex.: intensidade da dor) com valor grande e cor por gravidade. */
export function ScaleSlider({
  value,
  onChange,
  min = 0,
  max = 10,
  label = 'Intensidade',
  minLabel = 'Sem dor',
  maxLabel = 'Pior dor',
  severity = true,
}: ScaleSliderProps) {
  const id = useId();
  const v = value ?? min;
  const pct = ((v - min) / (max - min)) * 100;
  const color = severity && value !== undefined ? severityColor(v, max) : 'var(--accent)';

  return (
    <div className="stack gap-2">
      <div className="row between">
        <div className="row gap-2" style={{ alignItems: 'baseline' }}>
          <span className="slider-value" aria-live="polite">
            {value === undefined ? '–' : value}
          </span>
          <span className="t-subhead c-secondary">
            / {max}
            {value !== undefined && severity ? ` · ${severityText(v, max)}` : ''}
          </span>
        </div>
        {value !== undefined && (
          <Button variant="plain" size="sm" onClick={() => onChange(undefined)}>
            Limpar
          </Button>
        )}
      </div>
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <input
        id={id}
        type="range"
        className="slider"
        min={min}
        max={max}
        step={1}
        value={v}
        style={{ ['--pct' as string]: `${value === undefined ? 0 : pct}%`, ['--slider-color' as string]: color }}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={value === undefined ? 'não informado' : `${value} de ${max}`}
      />
      <div className="slider-scale" aria-hidden="true">
        {Array.from({ length: max - min + 1 }, (_, i) => (
          <span key={i}>{i + min}</span>
        ))}
      </div>
      <div className="row between t-caption c-secondary" aria-hidden="true">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}
