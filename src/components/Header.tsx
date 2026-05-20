import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserCircle, Menu } from 'lucide-react';
import { SYSTEM_NAME } from '../constants';
import { Logo } from './Logo';

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { profile } = useAuth();

  return (
    <header className="print:hidden bg-white border-b border-slate-100 h-16 flex items-center justify-between px-4 md:px-8 shrink-0 relative z-30">
      {/* Mobile Hamburger & Short Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer active:scale-95"
          aria-label="Abre menu de navegação"
        >
          <Menu className="w-6 h-6" />
        </button>
        
        {/* Short title with Logo visible only on mobile screens */}
        <div className="md:hidden flex items-center gap-2">
          <Logo fallbackSize="sm" className="h-8 w-auto" />
          <span className="font-black text-slate-900 tracking-tight text-sm select-none">
            Prendas 2026
          </span>
        </div>
      </div>
      
      {/* Desktop spacer to push profile to the right */}
      <div className="hidden md:block flex-1"></div>
      
      {/* Profile info - Compact on mobile, detailed on desktop */}
      <div className="flex items-center space-x-3 md:space-x-6">
        <div className="flex items-center">
          <div className="text-right">
            <p className="text-xs md:text-sm font-bold text-slate-800 tracking-tight leading-none md:leading-normal">
              {profile?.nome?.split(' ')[0] /* Carrega o primeiro nome apenas no cabeçalho */}
            </p>
            <div className="flex items-center justify-end gap-1 mt-0.5">
              <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-wider md:tracking-widest px-1 md:px-1.5 py-0.5 rounded ${
                profile?.perfil === 'admin' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-50 text-slate-600'
              }`}>
                {profile?.perfil === 'admin' ? 'Admin' : 'Usuário'}
              </span>
              
              <span className="hidden sm:inline-block text-[8px] md:text-[10px] font-black uppercase tracking-wider md:tracking-widest bg-blue-50 text-blue-600 px-1 md:px-1.5 py-0.5 rounded border border-blue-100">
                {profile?.turno === 'manha' ? 'M' : (profile?.turno === 'tarde' ? 'V' : 'Geral')}
              </span>
            </div>
          </div>
          <div className="ml-2.5 md:ml-4 p-0.5 md:p-1 rounded-full bg-slate-50 border border-slate-100 shrink-0">
            <UserCircle className="h-7 h-7 md:h-8 md:w-8 text-slate-400" />
          </div>
        </div>
      </div>
    </header>
  );
}

