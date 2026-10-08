import type { LucideIcon } from 'lucide-react';
import { Check } from 'lucide-react';

export interface OptionCard<T extends string> {
  value: T;
  title: string;
  description?: string;
  icon?: LucideIcon;
}

interface Props<T extends string> {
  options: OptionCard<T>[];
  value: T | undefined;
  onChange: (v: T) => void;
  ariaLabel: string;
  columns?: 1 | 2;
}

/** Cartões grandes de escolha única (ótimos para o polegar). */
export function OptionCards<T extends string>({ options, value, onChange, ariaLabel, columns = 2 }: Props<T>) {
  return (
    <div className="option-cards" data-cols={columns} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => {
        const Icon = o.icon;
        const selected = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={selected} className="option-card" onClick={() => onChange(o.value)}>
            <div className="row between">
              {Icon && (
                <span className="option-card-icon" aria-hidden="true">
                  <Icon size={20} strokeWidth={1.9} />
                </span>
              )}
              <span className="option-card-check" aria-hidden="true">
                {selected && <Check size={14} strokeWidth={3} />}
              </span>
            </div>
            <span className="option-card-title">{o.title}</span>
            {o.description && <span className="option-card-desc">{o.description}</span>}
          </button>
        );
      })}
    </div>
  );
}
