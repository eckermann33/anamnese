import type { VitalTone } from '../../clinical/vitals';

/* Minigráfico de tendência (sem eixos): linha fina + ponto final colorido. */

interface Props {
  values: number[];
  tone?: VitalTone;
  width?: number;
  height?: number;
  /** Descrição para leitores de tela (ex.: "FC: 110, 96, 88"). */
  label: string;
}

export function Sparkline({ values, tone, width = 96, height = 32, label }: Props) {
  if (values.length < 2) {
    return <svg className="sparkline" width={width} height={height} role="img" aria-label={label} />;
  }
  const pad = 4;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = (width - pad * 2) / (values.length - 1);
  const pts = values.map((v, i) => [pad + i * step, pad + (height - pad * 2) * (1 - (v - min) / span)] as const);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={3.25} className="sparkline-dot" data-tone={tone} />
    </svg>
  );
}
