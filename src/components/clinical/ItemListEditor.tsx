import { Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '../ui/Button';

/* Editor genérico de listas (cirurgias, internações, alergias, medicações…). */

export interface FieldSpec<T> {
  key: keyof T & string;
  placeholder: string;
  width?: string;
  inputMode?: 'text' | 'numeric' | 'decimal';
  /** Campo que usa sugestões (autocompletar). */
  list?: string;
}

interface Props<T extends { id: string }> {
  items: T[];
  onChange: (items: T[]) => void;
  fields: FieldSpec<T>[];
  create: () => T;
  addLabel: string;
  /** Conteúdo extra por item (ex.: seletor de gravidade da alergia). */
  renderExtra?: (item: T, patch: (p: Partial<T>) => void) => ReactNode;
  ariaLabel: string;
}

export function ItemListEditor<T extends { id: string }>({ items, onChange, fields, create, addLabel, renderExtra, ariaLabel }: Props<T>) {
  const patch = (id: string, p: Partial<T>) => onChange(items.map((it) => (it.id === id ? { ...it, ...p } : it)));
  return (
    <div className="item-list" aria-label={ariaLabel}>
      {items.map((it, idx) => (
        <div key={it.id} className="item-row">
          <div className="item-fields">
            {fields.map((f, i) => (
              <input
                key={f.key}
                className="input"
                style={f.width ? { flex: `0 0 ${f.width}`, width: f.width } : undefined}
                placeholder={f.placeholder}
                inputMode={f.inputMode}
                list={f.list}
                aria-label={`${f.placeholder} (${idx + 1})`}
                value={String((it[f.key] as unknown) ?? '')}
                autoFocus={i === 0 && !String((it[f.key] as unknown) ?? '') && idx === items.length - 1}
                onChange={(e) => patch(it.id, { [f.key]: e.target.value } as Partial<T>)}
              />
            ))}
          </div>
          {renderExtra?.(it, (p) => patch(it.id, p))}
          <Button variant="plain" iconOnly icon={Trash2} aria-label="Remover" onClick={() => onChange(items.filter((x) => x.id !== it.id))} />
        </div>
      ))}
      <Button variant="tinted" size="sm" icon={Plus} onClick={() => onChange([...items, create()])}>
        {addLabel}
      </Button>
    </div>
  );
}
