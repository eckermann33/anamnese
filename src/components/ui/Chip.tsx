import type { ReactNode } from 'react';
import { Check, Minus } from 'lucide-react';
import { cx } from '../../lib/cx';

export type ChipFlag = 'red' | 'orange';

export interface ChipOption {
  value: string;
  label: string;
  /** Opção que indica gravidade: quando marcada, o chip fica vermelho/laranja. */
  flag?: ChipFlag;
}

interface ChipProps {
  selected?: boolean;
  flag?: ChipFlag;
  onClick?: () => void;
  children: ReactNode;
  small?: boolean;
  className?: string;
}

/** Chip simples (liga/desliga). */
export function Chip({ selected, flag, onClick, children, small, className }: ChipProps) {
  return (
    <button
      type="button"
      className={cx('chip', small && 'chip-sm', className)}
      aria-pressed={!!selected}
      data-flag={flag}
      onClick={onClick}
    >
      {selected && <Check className="chip-icon" size={16} strokeWidth={2.5} aria-hidden="true" />}
      {children}
    </button>
  );
}

interface ChipSelectProps {
  options: ChipOption[];
  value: string | string[] | undefined;
  onChange: (value: string | string[] | undefined) => void;
  multiple?: boolean;
  ariaLabel?: string;
  small?: boolean;
}

/** Grupo de chips com seleção única ou múltipla. Tocar de novo desmarca. */
export function ChipSelect({ options, value, onChange, multiple, ariaLabel, small }: ChipSelectProps) {
  const selected = new Set(Array.isArray(value) ? value : value ? [value] : []);
  function toggle(v: string) {
    if (multiple) {
      const next = new Set(selected);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      onChange(next.size ? options.map((o) => o.value).filter((o) => next.has(o)) : undefined);
    } else {
      onChange(selected.has(v) ? undefined : v);
    }
  }
  return (
    <div className="chip-group" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <Chip key={o.value} selected={selected.has(o.value)} flag={o.flag} onClick={() => toggle(o.value)} small={small}>
          {o.label}
        </Chip>
      ))}
    </div>
  );
}

export type TriState = 'sim' | 'nao';

interface TriStateChipsProps {
  options: ChipOption[];
  value: Record<string, TriState> | undefined;
  onChange: (value: Record<string, TriState> | undefined) => void;
  ariaLabel?: string;
}

/**
 * Chips de sintomas com 3 estados — ideal para anamnese rápida:
 *   1º toque = PRESENTE (azul)   2º toque = NEGA (tracejado)   3º toque = limpa.
 * Assim dá para registrar também os negativos pertinentes ("nega dispneia").
 */
export function TriStateChips({ options, value, onChange, ariaLabel }: TriStateChipsProps) {
  const state = value ?? {};
  function cycle(v: string) {
    const next = { ...state };
    if (!next[v]) next[v] = 'sim';
    else if (next[v] === 'sim') next[v] = 'nao';
    else delete next[v];
    onChange(Object.keys(next).length ? next : undefined);
  }
  return (
    <div className="chip-group" role="group" aria-label={ariaLabel}>
      {options.map((o) => {
        const s = state[o.value];
        return (
          <button
            key={o.value}
            type="button"
            className="chip"
            data-state={s}
            data-flag={o.flag}
            onClick={() => cycle(o.value)}
            aria-label={`${o.label}: ${s === 'sim' ? 'presente' : s === 'nao' ? 'negado' : 'não perguntado'}`}
          >
            {s === 'sim' && <Check className="chip-icon" size={16} strokeWidth={2.5} aria-hidden="true" />}
            {s === 'nao' && <Minus className="chip-icon" size={16} strokeWidth={2.5} aria-hidden="true" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
