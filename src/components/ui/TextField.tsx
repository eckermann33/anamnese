import { useEffect, useId, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cx } from '../../lib/cx';
import { formatNumber, parseNumber } from '../../lib/format';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: ReactNode;
  value: string | undefined;
  onChange: (value: string) => void;
  hint?: ReactNode;
}

export function TextField({ label, value, onChange, hint, className, id, ...rest }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={cx('field', className)}>
      {label && (
        <label className="field-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input id={inputId} className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />
      {hint && <span className="field-label">{hint}</span>}
    </div>
  );
}

interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> {
  label?: ReactNode;
  value: string | undefined;
  onChange: (value: string) => void;
}

/** Área de texto que cresce com o conteúdo (field-sizing: content). */
export function TextArea({ label, value, onChange, className, id, rows = 3, ...rest }: TextAreaProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={cx('field', className)}>
      {label && (
        <label className="field-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className="textarea"
        rows={rows}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
    </div>
  );
}

interface NumberFieldProps {
  label?: ReactNode;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  unit?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  decimals?: number;
  id?: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * Campo numérico que aceita vírgula ("36,8") — teclado decimal no celular.
 * Mantém o texto digitado enquanto o usuário edita e salva o número.
 */
export function NumberField({
  label,
  value,
  onChange,
  unit,
  placeholder,
  min,
  max,
  decimals = 1,
  id,
  className,
  ariaLabel,
}: NumberFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [text, setText] = useState(value === undefined ? '' : formatNumber(value, decimals));

  // Atualiza o texto quando o valor muda por fora (ex.: ditado, "evoluir de ontem").
  useEffect(() => {
    setText((current) => {
      const parsed = parseNumber(current);
      if (parsed === value) return current;
      return value === undefined ? '' : formatNumber(value, decimals);
    });
  }, [value, decimals]);

  function handle(raw: string) {
    const cleaned = raw.replace(/[^\d.,-]/g, '');
    setText(cleaned);
    const n = parseNumber(cleaned);
    if (n === undefined) {
      onChange(undefined);
      return;
    }
    if ((min !== undefined && n < min) || (max !== undefined && n > max)) return;
    onChange(n);
  }

  return (
    <div className={cx('field', className)}>
      {label && (
        <label className="field-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className="input-group">
        <input
          id={inputId}
          className="input tabular"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="next"
          placeholder={placeholder}
          value={text}
          aria-label={ariaLabel}
          onChange={(e) => handle(e.target.value)}
        />
        {unit && <span className="input-addon">{unit}</span>}
      </div>
    </div>
  );
}

interface SelectProps {
  label?: ReactNode;
  value: string | undefined;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  id?: string;
}

export function Select({ label, value, onChange, options, placeholder = 'Selecionar', id }: SelectProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="field">
      {label && (
        <label className="field-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <select id={inputId} className="select" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
