import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../contexts/AuthContext';
import { WifiOff, AlertTriangle } from 'lucide-react';

export function Layout() {
  const { user, profile, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const location = useLocation();

  // Fecha o menu lateral automaticamente quando a rota muda (clique em links no mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // Monitora a conexão de rede em tempo real
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  // Se não estiver logado ou sem perfil, o App.tsx decidirá o que mostrar.
  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-50 print:h-auto print:bg-white text-slate-900">
      {/* Dynamic Offline Bar as specified in Protocol */}
      {isOffline && (
        <div className="bg-red-600 text-white px-4 py-2.5 flex items-center justify-center gap-3 text-xs md:text-sm font-bold shadow-md z-50 shrink-0 select-none animate-bounce">
          <WifiOff className="w-4 h-4 md:w-5 h-5 animate-pulse shrink-0" />
          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
            <span>Você está offline! O sinal do Wi-Fi escolar caiu ou foi desconectado.</span>
            <span className="opacity-90 font-medium text-[10px] md:text-xs">Siga o Plano de Contingência no Protocolo de Operação.</span>
          </div>
        </div>
      )}

      <div className="flex-1 flex h-full w-full overflow-hidden relative">
        {/* Sidebar - Controlada como Drawer no mobile e fixo no desktop */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        
        {/* Backdrop para fechar ao clicar fora no mobile */}
        {isSidebarOpen && (
          <div 
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden absolute inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity duration-300"
            id="sidebar-backdrop"
          />
        )}

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:overflow-visible">
          <Header onMenuToggle={() => setIsSidebarOpen(prev => !prev)} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 print:overflow-visible print:p-0 print:m-0 w-full max-w-full overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}


