import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';

// Registrar Service Worker
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Nova versão disponível! Recarregar?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('🎉 App pronto para funcionar offline!');
  },
});

createRoot(document.getElementById("root")!).render(<App />);
