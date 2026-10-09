import type { ReactNode, InputHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { cx } from '../../lib/cx';

/* Listas agrupadas no estilo do app Ajustes do iOS ("inset grouped").

   <ListSection header="Paciente" footer="Texto de ajuda">
     <ListRow icon={User} title="Iniciais" value="J.S." />
     <ListRow title="Abrir" to="/rota" chevron />
   </ListSection>
*/

interface ListSectionProps {
  header?: ReactNode;
  headerAction?: ReactNode;
  footer?: ReactNode;
  /** true quando as linhas têm ícone (ajusta o separador). */
  icons?: boolean;
  children: ReactNode;
  className?: string;
  id?: string;
}

export function ListSection({ header, headerAction, footer, icons, children, className, id }: ListSectionProps) {
  return (
    <section className={cx('list-section', className)} id={id}>
      {(header || headerAction) && (
        <div className="list-header">
          <span>{header}</span>
          {headerAction}
        </div>
      )}
      <div className="list-group" data-icons={icons || undefined}>
        {children}
      </div>
      {footer && <div className="list-footer">{footer}</div>}
    </section>
  );
}

type Tone = 'accent' | 'red' | 'orange' | 'green' | 'gray';

interface ListRowProps {
  icon?: LucideIcon;
  iconTone?: Tone;
  title: ReactNode;
  subtitle?: ReactNode;
  value?: ReactNode;
  /** Conteúdo à direita (toggle, tag etc.). */
  trailing?: ReactNode;
  chevron?: boolean;
  to?: string;
  onClick?: () => void;
  destructive?: boolean;
  accent?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function ListRow({
  icon: Icon,
  iconTone = 'accent',
  title,
  subtitle,
  value,
  trailing,
  chevron,
  to,
  onClick,
  destructive,
  accent,
  className,
  ariaLabel,
}: ListRowProps) {
  const content = (
    <>
      {Icon && (
        <span className="list-row-icon" data-tone={iconTone === 'accent' ? undefined : iconTone} aria-hidden="true">
          <Icon size={18} strokeWidth={2} />
        </span>
      )}
      <span className="list-row-body">
        <span className="list-row-title">{title}</span>
        {subtitle && <span className="list-row-subtitle">{subtitle}</span>}
      </span>
      {value !== undefined && value !== null && value !== '' && <span className="list-row-value ellipsis">{value}</span>}
      {trailing}
      {(chevron || to) && <ChevronRight className="list-row-chevron" size={18} strokeWidth={2.2} aria-hidden="true" />}
    </>
  );
  const common = {
    className: cx('list-row', className),
    'data-destructive': destructive || undefined,
    'data-accent': accent || undefined,
    'aria-label': ariaLabel,
  };
  if (to) {
    return (
      <Link to={to} {...common}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} {...common}>
        {content}
      </button>
    );
  }
  return <div {...common}>{content}</div>;
}

interface ListFieldRowProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label: ReactNode;
  value: string | number | undefined;
  onChange: (value: string) => void;
  suffix?: ReactNode;
  align?: 'left' | 'right';
}

/** Linha com rótulo à esquerda e campo à direita, como nos formulários do iOS. */
export function ListFieldRow({ label, value, onChange, suffix, align = 'right', id, ...rest }: ListFieldRowProps) {
  const inputId = id ?? `f-${String(label).replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className="list-row">
      <label htmlFor={inputId} className="list-row-title" style={{ flex: 'none' }}>
        {label}
      </label>
      <input
        id={inputId}
        className="list-row-field"
        data-align={align}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
      {suffix && <span className="c-secondary t-subhead">{suffix}</span>}
    </div>
  );
}
