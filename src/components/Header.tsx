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

  const perfil = profile?.perfil;
  const nomeReal = profile?.nome?.trim();

  // Determinar o texto de exibição em uma única linha, sem repetição ou badges desnecessários
  let nomeExibicao = '';
  if (perfil === 'admin') {
    const nomeValido = (nomeReal && nomeReal.toLowerCase() !== 'usuário' && nomeReal.toLowerCase() !== 'usuario') ? nomeReal : '';
    nomeExibicao = nomeValido || 'Administração';
  } else if (perfil === 'manha') {
    nomeExibicao = 'Operador Manhã';
  } else if (perfil === 'tarde') {
    nomeExibicao = 'Operador Tarde';
  } else if (perfil === 'consulta') {
    nomeExibicao = 'Consulta';
  } else {
    nomeExibicao = 'Usuário';
  }

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
      
      {/* Profile info - Single-line text & Avatar */}
      <div className="flex items-center space-x-3 md:space-x-4 animate-fade-in">
        <div className="flex items-center">
          <div className="text-right">
            <p className="text-xs md:text-sm font-extrabold text-slate-700 tracking-tight leading-none">
              {nomeExibicao}
            </p>
          </div>
          <div className="ml-2.5 md:ml-3 p-0.5 md:p-1 rounded-full bg-slate-50 border border-slate-100 shrink-0">
            <UserCircle className="h-7 w-7 md:h-8 md:w-8 text-slate-400" />
          </div>
        </div>
      </div>
    </header>
  );
}

