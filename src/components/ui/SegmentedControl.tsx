import { useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
  ariaLabel: string;
}

/** Controle segmentado estilo iOS, com indicador que desliza (spring). */
export function SegmentedControl<T extends string>({ options, value, onChange, ariaLabel }: SegmentedControlProps<T>) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const ref = useRef<HTMLDivElement>(null);

  // Setas do teclado trocam a opção (acessibilidade).
  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = (index + dir + options.length) % options.length;
    onChange(options[next].value);
    const buttons = ref.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    buttons?.[next]?.focus();
  }

  return (
    <div
      ref={ref}
      className="segmented"
      role="radiogroup"
      aria-label={ariaLabel}
      style={{ ['--count' as string]: options.length, ['--index' as string]: index }}
      onKeyDown={onKeyDown}
    >
      {value !== undefined && <span className="segmented-indicator" aria-hidden="true" />}
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={o.value === value || (value === undefined && o === options[0]) ? 0 : -1}
          className="segmented-option"
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
