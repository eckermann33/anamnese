import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './Button';
import { useBodyScrollLock } from '../../lib/useBodyScrollLock';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Botões extras no cabeçalho (à direita, antes do X). */
  actions?: ReactNode;
  children: ReactNode;
  /** Rótulo acessível quando não há título visível. */
  ariaLabel?: string;
}

const EXIT_MS = 260;
const CLOSE_DISTANCE = 110; // px arrastados para fechar
const CLOSE_VELOCITY = 0.6; // px/ms

/**
 * Sheet que sobe de baixo (vidro), com alça de arraste.
 * Arraste para baixo pela alça/cabeçalho para fechar; toque fora também fecha.
 *
 * <Sheet open={aberto} onClose={() => setAberto(false)} title="Por que perguntar?">…</Sheet>
 */
export function Sheet({ open, onClose, title, subtitle, actions, children, ariaLabel }: SheetProps) {
  const [render, setRender] = useState(open);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; lastY: number; lastT: number; v: number } | null>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  // Monta/desmonta com animação de saída.
  useEffect(() => {
    if (open) {
      setRender(true);
      setClosing(false);
      return;
    }
    if (!render) return;
    setClosing(true);
    const t = window.setTimeout(() => {
      setRender(false);
      setClosing(false);
    }, EXIT_MS);
    return () => window.clearTimeout(t);
  }, [open, render]);

  useBodyScrollLock(render);

  // Foco: entra na sheet ao abrir e volta para onde estava ao fechar.
  useEffect(() => {
    if (!render || closing) return;
    restoreFocus.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => panelRef.current?.focus(), 30);
    return () => {
      window.clearTimeout(t);
      restoreFocus.current?.focus?.();
    };
  }, [render, closing]);

  // Esc fecha.
  useEffect(() => {
    if (!render) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [render, onClose]);

  if (!render) return null;

  function setDrag(px: number) {
    panelRef.current?.style.setProperty('--drag', `${px}px`);
  }

  function onPointerDown(e: ReactPointerEvent) {
    if ((e.target as HTMLElement).closest('button')) return; // não arrasta ao tocar em botão
    drag.current = { startY: e.clientY, lastY: e.clientY, lastT: performance.now(), v: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    panelRef.current?.setAttribute('data-dragging', 'true');
  }
  function onPointerMove(e: ReactPointerEvent) {
    const d = drag.current;
    if (!d) return;
    const now = performance.now();
    d.v = (e.clientY - d.lastY) / Math.max(1, now - d.lastT);
    d.lastY = e.clientY;
    d.lastT = now;
    const dy = e.clientY - d.startY;
    // Para cima: resistência (efeito elástico). Para baixo: acompanha o dedo.
    setDrag(dy < 0 ? -Math.sqrt(-dy) * 2 : dy);
  }
  function onPointerUp(e: ReactPointerEvent) {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    panelRef.current?.removeAttribute('data-dragging');
    const dy = e.clientY - d.startY;
    if (dy > CLOSE_DISTANCE || d.v > CLOSE_VELOCITY) {
      onClose();
    }
    setDrag(0);
  }

  const dragHandlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
  };

  return createPortal(
    <div className="sheet-root" data-closing={closing || undefined}>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className="sheet-panel glass-strong"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? (typeof title === 'string' ? title : undefined)}
        tabIndex={-1}
      >
        <div className="sheet-grabber-area" {...dragHandlers}>
          <span className="sheet-grabber" aria-hidden="true" />
        </div>
        {(title || actions) && (
          <div className="sheet-header" {...dragHandlers}>
            <div className="sheet-title">
              {title}
              {subtitle && <div className="sheet-subtitle">{subtitle}</div>}
            </div>
            {actions}
            <Button variant="glass" size="sm" iconOnly icon={X} aria-label="Fechar" onClick={onClose} />
          </div>
        )}
        <div className="sheet-content">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
