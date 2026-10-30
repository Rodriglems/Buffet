import { useEffect } from "react";

/**
 * Registra o service worker do PWA (public/sw.js) só no build de produção: no `npm run dev`
 * ele guardaria arquivos que mudam a cada edição e atrapalharia o desenvolvimento.
 */
export function useServiceWorker() {
  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sem service worker o sistema funciona normalmente; só não fica instalável/offline.
    });
  }, []);
}
