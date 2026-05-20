import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../contexts/AuthContext';

export function Layout() {
  const { user, profile, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  // Fecha o menu lateral automaticamente quando a rota muda (clique em links no mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

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
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 print:h-auto print:bg-white text-slate-900">
      {/* Sidebar - Controlada como Drawer no mobile e fixo no desktop */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Backdrop para fechar ao clicar fora no mobile */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity duration-300"
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
  );
}

