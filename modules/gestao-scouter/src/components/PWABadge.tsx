import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

export function PWABadge() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('✅ Service Worker registered:', r);
    },
    onRegisterError(error) {
      console.error('❌ Service Worker registration error:', error);
    },
  });

  useEffect(() => {
    if (offlineReady) {
      toast.success('App pronto para funcionar offline!', {
        description: 'Você pode usar o aplicativo mesmo sem conexão.',
        duration: 5000,
      });
    }
  }, [offlineReady]);

  useEffect(() => {
    if (needRefresh) {
      toast('Atualização disponível!', {
        description: 'Uma nova versão do app está disponível.',
        duration: 0,
        action: {
          label: 'Atualizar',
          onClick: () => {
            updateServiceWorker(true);
          },
        },
        cancel: {
          label: 'Depois',
          onClick: () => {
            setNeedRefresh(false);
          },
        },
      });
    }
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  // This component doesn't render anything visible
  return null;
}
