import { useEffect } from 'react';

let locks = 0;

/** Trava a rolagem da página enquanto uma sheet/alerta está aberto. */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    locks += 1;
    const html = document.documentElement;
    if (locks === 1) {
      html.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }
    return () => {
      locks -= 1;
      if (locks === 0) {
        html.style.overflow = '';
        document.body.style.overflow = '';
      }
    };
  }, [active]);
}
