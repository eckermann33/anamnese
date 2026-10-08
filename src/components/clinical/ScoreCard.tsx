import { useState } from 'react';
import { ChevronDown, Sparkles, PencilLine, CircleDashed } from 'lucide-react';
import type { ScoreResult } from '../../clinical/scores';
import { formatNumber } from '../../lib/format';
import { Chip } from '../ui/Chip';
import { ReferenceList } from './References';

/* ==========================================================================
   CARTÃO DE ESCORE
   Itens preenchidos automaticamente (✦), marcados à mão (✎) ou faltando (◌).
   Toque num item para corrigir/preencher manualmente.
   ========================================================================== */

interface Props {
  result: ScoreResult;
  onSet: (itemId: string, value: number | undefined) => void;
  reason?: string;
  defaultOpen?: boolean;
}

export function ScoreCard({ result, onSet, reason, defaultOpen }: Props) {
  const [open, setOpen] = useState(!!defaultOpen);
  const { def, total, values, source, missing, interpretation } = result;

  return (
    <article className="score-card" data-tone={interpretation.tone}>
      <button type="button" className="score-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <div className="stack grow">
          <span className="score-name">{def.name}</span>
          <span className="score-interp">{interpretation.text}</span>
          {reason && <span className="t-footnote c-secondary">IA: {reason}</span>}
        </div>
        <span className="score-total tabular" aria-label={`Total ${total}`}>
          {formatNumber(total, 1)}
          {def.max !== undefined && <small>/{def.max}</small>}
        </span>
        <ChevronDown size={20} className="score-chevron" data-open={open || undefined} aria-hidden="true" />
      </button>
      {missing.length > 0 && !open && (
        <p className="score-missing">Faltam: {missing.join(' · ')}</p>
      )}
      {open && (
        <div className="score-body">
          <p className="t-footnote c-secondary">{def.description}</p>
          <ul className="score-items">
            {def.items.map((item) => {
              const v = values[item.id];
              const src = source[item.id];
              const Icon = src === 'auto' ? Sparkles : src === 'manual' ? PencilLine : CircleDashed;
              return (
                <li key={item.id} className="score-item" data-source={src}>
                  <div className="row gap-2">
                    <Icon size={16} aria-label={src === 'auto' ? 'preenchido automaticamente' : src === 'manual' ? 'marcado manualmente' : 'faltando'} />
                    <span className="grow t-subhead">{item.label}</span>
                    <span className="tabular t-subhead w-semibold">{v === undefined ? '—' : formatNumber(v, 1)}</span>
                  </div>
                  {item.hint && <div className="t-caption c-secondary">{item.hint}</div>}
                  <div className="chip-group mt-2">
                    {item.options ? (
                      item.options.map((o) => (
                        <Chip key={o.label} small selected={v === o.points && src !== 'faltando'} onClick={() => onSet(item.id, o.points)}>
                          {o.label} ({o.points > 0 ? '+' : ''}
                          {o.points})
                        </Chip>
                      ))
                    ) : (
                      <>
                        <Chip small selected={v === item.points && src !== 'faltando'} onClick={() => onSet(item.id, item.points)}>
                          Sim ({(item.points ?? 0) > 0 ? '+' : ''}
                          {item.points})
                        </Chip>
                        <Chip small selected={v === 0 && src !== 'faltando'} onClick={() => onSet(item.id, 0)}>
                          Não (0)
                        </Chip>
                      </>
                    )}
                    {src === 'manual' && (
                      <button type="button" className="btn btn-plain btn-sm" onClick={() => onSet(item.id, undefined)}>
                        Usar automático
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <ReferenceList ids={def.refs} />
        </div>
      )}
    </article>
  );
}
