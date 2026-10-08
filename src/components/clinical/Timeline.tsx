import { Plus, Trash2 } from 'lucide-react';
import type { DurationUnit } from '../../clinical/types';
import type { TimelineEvent } from '../../db/types';
import { uid } from '../../db';
import { durationToDays } from '../../clinical/context';
import { formatNumber } from '../../lib/format';
import { Button } from '../ui/Button';

/* ==========================================================================
   LINHA DO TEMPO DOS SINTOMAS
   Montada a partir da HDA (início da queixa) + eventos que você adiciona
   ("há 3 dias: febre"). Mostrada na vertical, do mais antigo para o atual.
   ========================================================================== */

const UNITS: DurationUnit[] = ['minutos', 'horas', 'dias', 'semanas', 'meses', 'anos'];

interface Props {
  events: TimelineEvent[];
  onChange: (events: TimelineEvent[]) => void;
  complaint: { text: string; duration?: number; durationUnit: DurationUnit };
  /** Sintomas presentes (para sugerir eventos com 1 toque). */
  suggestions: string[];
}

export function Timeline({ events, onChange, complaint, suggestions }: Props) {
  const items = [
    ...events.map((e) => ({ ...e, days: durationToDays(e.ago, e.agoUnit) ?? 0, auto: false })),
    ...(complaint.duration !== undefined && complaint.text
      ? [
          {
            id: 'qp',
            ago: complaint.duration,
            agoUnit: complaint.durationUnit,
            label: `Início: ${complaint.text}`,
            days: durationToDays(complaint.duration, complaint.durationUnit) ?? 0,
            auto: true,
          },
        ]
      : []),
  ].sort((a, b) => b.days - a.days);

  function patch(id: string, p: Partial<TimelineEvent>) {
    onChange(events.map((e) => (e.id === id ? { ...e, ...p } : e)));
  }

  const unused = suggestions.filter((s) => !events.some((e) => e.label.toLowerCase() === s.toLowerCase())).slice(0, 8);

  return (
    <div className="timeline-wrap">
      <ol className="timeline">
        {items.map((it) => (
          <li key={it.id} className="timeline-item" data-auto={it.auto || undefined}>
            <span className="timeline-dot" aria-hidden="true" />
            <div className="timeline-when tabular">{it.ago !== undefined ? `há ${formatNumber(it.ago)} ${it.agoUnit}` : 'quando?'}</div>
            {it.auto ? (
              <div className="timeline-label">{it.label}</div>
            ) : (
              <div className="timeline-edit">
                <input
                  className="input"
                  value={it.label}
                  placeholder="O que aconteceu?"
                  aria-label="Evento"
                  onChange={(e) => patch(it.id, { label: e.target.value })}
                />
                <div className="row gap-2">
                  <input
                    className="input tabular"
                    style={{ width: 84 }}
                    inputMode="decimal"
                    aria-label="Há quanto tempo"
                    value={it.ago ?? ''}
                    placeholder="Nº"
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(',', '.'));
                      patch(it.id, { ago: e.target.value === '' || Number.isNaN(n) ? undefined : n });
                    }}
                  />
                  <select className="select" aria-label="Unidade" value={it.agoUnit} onChange={(e) => patch(it.id, { agoUnit: e.target.value as DurationUnit })}>
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u} atrás
                      </option>
                    ))}
                  </select>
                  <Button variant="plain" iconOnly icon={Trash2} aria-label="Remover evento" onClick={() => onChange(events.filter((e) => e.id !== it.id))} />
                </div>
              </div>
            )}
          </li>
        ))}
        <li className="timeline-item timeline-now">
          <span className="timeline-dot" aria-hidden="true" />
          <div className="timeline-when">agora</div>
          <div className="timeline-label">Atendimento</div>
        </li>
      </ol>
      <div className="stack gap-2 mt-3">
        <Button
          variant="tinted"
          size="sm"
          icon={Plus}
          onClick={() => onChange([...events, { id: uid(), label: '', agoUnit: 'dias' }])}
        >
          Adicionar evento
        </Button>
        {unused.length > 0 && (
          <div className="chip-group" aria-label="Sugestões a partir dos sintomas">
            {unused.map((s) => (
              <button key={s} type="button" className="chip chip-sm" onClick={() => onChange([...events, { id: uid(), label: s, agoUnit: 'dias' }])}>
                <Plus size={14} aria-hidden="true" /> {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
