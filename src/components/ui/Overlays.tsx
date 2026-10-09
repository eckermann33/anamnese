import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Button } from './Button';
import { useBodyScrollLock } from '../../lib/useBodyScrollLock';

/* ==========================================================================
   Alertas de confirmação (estilo iOS) e toasts.
   Use os hooks:
     const confirm = useConfirm();
     if (await confirm({ title: 'Apagar tudo?', destructive: true })) …
     const toast = useToast();
     toast('Copiado', 'success');
   ========================================================================== */

interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type ToastTone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  text: string;
  tone: ToastTone;
  action?: { label: string; onClick: () => void };
}

interface OverlayContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  toast: (text: string, tone?: ToastTone, action?: ToastItem['action']) => void;
}

const OverlayContext = createContext<OverlayContextValue | null>(null);

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const confirm = useCallback(
    (opts: ConfirmOptions) => new Promise<boolean>((resolve) => setDialog({ ...opts, resolve })),
    [],
  );

  const toast = useCallback((text: string, tone: ToastTone = 'success', action?: ToastItem['action']) => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-2), { id, text, tone, action }]);
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), action ? 6000 : 2400);
  }, []);

  function close(result: boolean) {
    dialog?.resolve(result);
    setDialog(null);
  }

  return (
    <OverlayContext.Provider value={{ confirm, toast }}>
      {children}
      {dialog && <AlertDialog {...dialog} onClose={close} />}
      {createPortal(
        <div className="toast-region" role="status" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className="toast glass-strong" data-tone={t.tone}>
              {t.tone === 'success' && <CheckCircle2 size={18} aria-hidden="true" />}
              {t.tone === 'error' && <AlertCircle size={18} aria-hidden="true" />}
              {t.tone === 'info' && <Info size={18} aria-hidden="true" />}
              <span>{t.text}</span>
              {t.action && (
                <button
                  type="button"
                  className="toast-action"
                  onClick={() => {
                    t.action?.onClick();
                    setToasts((list) => list.filter((x) => x.id !== t.id));
                  }}
                >
                  {t.action.label}
                </button>
              )}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </OverlayContext.Provider>
  );
}

function AlertDialog({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive,
  onClose,
}: ConfirmOptions & { onClose: (v: boolean) => void }) {
  useBodyScrollLock(true);
  useEffect(() => {
    // Em ação destrutiva, o foco inicial vai para "Cancelar" (mais seguro).
    const el = document.querySelector<HTMLButtonElement>(
      destructive ? '.alert-panel [data-cancel]' : '.alert-panel [data-confirm]',
    );
    el?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [destructive, onClose]);

  return createPortal(
    <div className="alert-root">
      <div className="alert-backdrop" aria-hidden="true" onClick={() => onClose(false)} />
      <div className="alert-panel glass-strong" role="alertdialog" aria-modal="true" aria-labelledby="alert-title">
        <h2 id="alert-title" className="alert-title">
          {title}
        </h2>
        {message && <div className="alert-message">{message}</div>}
        <div className="alert-actions" data-inline="true">
          <Button variant="gray" data-cancel onClick={() => onClose(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive-fill' : 'primary'}
            data-confirm
            onClick={() => onClose(true)}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function useOverlay() {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error('OverlayProvider ausente');
  return ctx;
}

export function useConfirm() {
  return useOverlay().confirm;
}

export function useToast() {
  return useOverlay().toast;
}
