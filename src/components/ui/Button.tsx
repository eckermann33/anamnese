import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cx } from '../../lib/cx';

export type ButtonVariant =
  | 'primary' // vidro tingido de azul — ação principal
  | 'glass' // vidro neutro — controles flutuantes
  | 'tinted' // azul claro sólido — ação secundária no conteúdo
  | 'gray'
  | 'plain' // só texto azul
  | 'destructive'
  | 'destructive-fill';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  icon?: LucideIcon;
  /** Botão redondo só com ícone. Exige `aria-label`. */
  iconOnly?: boolean;
  loading?: boolean;
  children?: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'btn-primary glass-accent',
  glass: 'btn-glass glass',
  tinted: 'btn-tinted',
  gray: 'btn-gray',
  plain: 'btn-plain',
  destructive: 'btn-destructive',
  'destructive-fill': 'btn-destructive-fill',
};

/**
 * Botão do design system.
 * Ex.: <Button variant="primary" icon={Plus}>Novo atendimento</Button>
 */
export function Button({
  variant = 'tinted',
  size = 'md',
  block,
  icon: Icon,
  iconOnly,
  loading,
  className,
  children,
  type = 'button',
  disabled,
  ...rest
}: ButtonProps) {
  const iconSize = size === 'sm' ? 18 : 20;
  return (
    <button
      type={type}
      className={cx(
        'btn',
        VARIANT_CLASS[variant],
        size === 'sm' && 'btn-sm',
        size === 'lg' && 'btn-lg',
        block && 'btn-block',
        iconOnly && 'btn-icon',
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span className="spinner" aria-hidden="true" />
      ) : (
        Icon && <Icon size={iconSize} strokeWidth={1.9} aria-hidden="true" />
      )}
      {!iconOnly && children}
    </button>
  );
}
