import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cx } from '../../lib/cx';

/** true quando a página rolou mais que `threshold` px. */
export function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(() => typeof window !== 'undefined' && window.scrollY > threshold);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}

interface PageProps {
  /** Título da página (aparece grande no topo e pequeno na barra ao rolar). */
  title: string;
  /** Subtítulo abaixo do título grande. */
  subtitle?: ReactNode;
  /** Sem título grande: mostra o título sempre na barra. */
  compact?: boolean;
  back?: { to?: string; label?: string; onClick?: () => void };
  /** Botões à direita na barra superior. */
  actions?: ReactNode;
  /** Área fixa abaixo da barra (alergias, red flags, progresso). */
  sticky?: ReactNode;
  /** Página com barra de ações inferior (sem tab bar). */
  toolbar?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Estrutura padrão de tela: barra superior de vidro + título grande + conteúdo.
 * A barra fica transparente no topo e vira vidro quando o conteúdo rola por baixo.
 */
export function Page({ title, subtitle, compact, back, actions, sticky, toolbar, children, className }: PageProps) {
  const scrolled = useScrolled(compact ? 2 : 40);
  const navRef = useRef<HTMLElement>(null);
  const [navHeight, setNavHeight] = useState<number>();

  // Mede a barra (que pode crescer com banners) para empurrar o conteúdo.
  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const update = () => setNavHeight(el.getBoundingClientRect().height);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <>
      <header
        ref={navRef}
        className="navbar"
        data-scrolled={scrolled || !!sticky || undefined}
        data-title-always={compact || undefined}
      >
        <div className="navbar-bg glass" aria-hidden="true" />
        <div className="navbar-inner">
          <div className="navbar-side">
            {back &&
              (back.to ? (
                <Link to={back.to} className="nav-back glass" aria-label={`Voltar para ${back.label ?? 'anterior'}`}>
                  <ChevronLeft size={22} strokeWidth={2.2} aria-hidden="true" />
                  <span>{back.label ?? 'Voltar'}</span>
                </Link>
              ) : (
                <button type="button" className="nav-back glass" onClick={back.onClick}>
                  <ChevronLeft size={22} strokeWidth={2.2} aria-hidden="true" />
                  <span>{back.label ?? 'Voltar'}</span>
                </button>
              ))}
          </div>
          <div className="navbar-title" aria-hidden={!compact && !scrolled}>
            {title}
          </div>
          <div className="navbar-side" data-side="right">
            {actions}
          </div>
        </div>
        {sticky && <div className="nav-extra">{sticky}</div>}
      </header>
      <main
        className={cx('page', className)}
        data-toolbar={toolbar || undefined}
        style={navHeight ? { paddingTop: navHeight + 4 } : undefined}
      >
        {!compact && (
          <div className="large-title">
            <h1 className="t-large-title">{title}</h1>
            {subtitle && <div className="large-title-sub">{subtitle}</div>}
          </div>
        )}
        {compact && <h1 className="visually-hidden">{title}</h1>}
        {children}
      </main>
    </>
  );
}

interface EmptyStateProps {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, children, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">
        <Icon size={30} strokeWidth={1.75} />
      </div>
      <div className="empty-state-title">{title}</div>
      {children && <div className="t-subhead">{children}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/** Aviso clínico fixo. */
export function Disclaimer({ children, icon: Icon }: { children: ReactNode; icon?: React.ComponentType<{ size?: number }> }) {
  return (
    <div className="disclaimer" role="note">
      {Icon && <Icon size={16} />}
      <span>{children}</span>
    </div>
  );
}
