import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";

const UPDATE_INTERVAL_MS = 60 * 60 * 1000; // 1 hora

export function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        setInterval(() => {
          registration.update();
        }, UPDATE_INTERVAL_MS);
      }
    },
  });

  useEffect(() => {
    if (offlineReady) {
      toast.success("Aplicativo pronto para uso offline");
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady]);

  useEffect(() => {
    if (needRefresh) {
      toast.info("Nova versão disponível", {
        action: {
          label: "Atualizar",
          onClick: () => {
            setNeedRefresh(false);
            updateServiceWorker(true);
          },
        },
        duration: 10000,
      });
    }
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
}
