import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from './ui/Button';

/**
 * Service worker do PWA: deixa o app funcionando offline e avisa quando há
 * versão nova (o usuário escolhe a hora de atualizar — nada some no meio do
 * atendimento; os dados ficam salvos de qualquer forma).
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  // O aviso "pronto para offline" some sozinho em 4 s.
  useEffect(() => {
    if (!offlineReady) return;
    const t = window.setTimeout(() => setOfflineReady(false), 4000);
    return () => window.clearTimeout(t);
  }, [offlineReady, setOfflineReady]);

  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="update-toast glass-strong" role="status">
      <span className="grow t-subhead">{needRefresh ? 'Nova versão disponível.' : 'Pronto para funcionar offline.'}</span>
      {needRefresh ? (
        <Button variant="primary" size="sm" icon={RefreshCw} onClick={() => void updateServiceWorker(true)}>
          Atualizar
        </Button>
      ) : null}
      <Button
        variant="plain"
        size="sm"
        onClick={() => {
          setNeedRefresh(false);
          setOfflineReady(false);
        }}
      >
        OK
      </Button>
    </div>
  );
}
