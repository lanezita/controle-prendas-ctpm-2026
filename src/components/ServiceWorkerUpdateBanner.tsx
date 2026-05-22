import React, { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RefreshCw, X } from 'lucide-react';

export function ServiceWorkerUpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const handleUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<ServiceWorkerRegistration>;
      if (customEvent.detail) {
        registrationRef.current = customEvent.detail;
      }
      setUpdateAvailable(true);
    };

    window.addEventListener('sw-update-available', handleUpdate);

    // Also check if there is already a waiting service worker registered
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          registrationRef.current = reg;
          setUpdateAvailable(true);
        }
      });
    }

    return () => {
      window.removeEventListener('sw-update-available', handleUpdate);
    };
  }, []);

  const handleUpdateClick = () => {
    if (registrationRef.current && registrationRef.current.waiting) {
      // Send skipWaiting command to the waiting worker
      registrationRef.current.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      // Direct fallback reload
      window.location.reload();
    }
  };

  return (
    <AnimatePresence>
      {updateAvailable && (
        <motion.div
          id="pwa-update-banner"
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 shadow-2xl flex items-start gap-4"
        >
          <div className="w-10 h-10 bg-indigo-600/20 border border-indigo-500/30 rounded-xl flex items-center justify-center text-indigo-400 shrink-0 select-none">
            <RefreshCw className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <h3 className="text-sm font-bold tracking-tight text-white">Nova versão disponível</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              O sistema recebeu atualizações. Toque abaixo para carregar a versão mais recente.
            </p>
            <button
              id="pwa-update-btn"
              onClick={handleUpdateClick}
              className="mt-3 inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black uppercase tracking-wider px-3.5 py-2 rounded-lg cursor-pointer transition-all active:scale-95 shadow-lg shadow-indigo-600/10"
            >
              Clique para atualizar
            </button>
          </div>
          <button
            id="pwa-update-close"
            onClick={() => setUpdateAvailable(false)}
            className="text-slate-500 hover:text-slate-300 p-1 rounded-lg cursor-pointer transition-colors"
            aria-label="Ignorar por enquanto"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
