import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Edit, Search, Trophy, 
  Users, Gift, Zap, LogOut, LayoutDashboard, UserCheck, X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { Logo } from './Logo';
import { SYSTEM_NAME, SCHOOL_NAME } from '../constants';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { profile, logout } = useAuth();
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Painel Inicial', path: '/', roles: ['admin', 'manha', 'tarde', 'consulta'] },
    { icon: Edit, label: 'Lançamento de Prendas', path: '/lancamento', roles: ['admin', 'manha', 'tarde'] },
    { icon: Search, label: 'Consulta de Recibos', path: '/recibos', roles: ['admin', 'manha', 'tarde', 'consulta'] },
    { icon: Trophy, label: 'Ranking', path: '/ranking', roles: ['admin', 'manha', 'tarde', 'consulta'] },
    { icon: Users, label: 'Alunos', path: '/alunos', roles: ['admin', 'manha', 'tarde', 'consulta'] },
    { icon: Gift, label: 'Prendas', path: '/prendas', roles: ['admin', 'manha', 'tarde'], perm: 'pode_cadastrar_prendas' },
    { icon: Zap, label: 'Campanhas Relâmpago', path: '/campanhas', roles: ['admin', 'manha', 'tarde'], perm: 'pode_cadastrar_campanhas' },
    { icon: UserCheck, label: 'Turmas', path: '/turmas', roles: ['admin', 'manha', 'tarde', 'consulta'] },
    { icon: Users, label: 'Usuários', path: '/usuarios', roles: ['admin'] },
  ];

  return (
    <div 
      className={cn(
        "print:hidden flex flex-col w-72 bg-slate-900 text-slate-300 h-screen overflow-y-auto shrink-0 transition-transform duration-300 ease-in-out fixed md:relative inset-y-0 left-0 z-50 md:z-20 border-r border-slate-800 shadow-2xl md:shadow-none",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      <div className="p-6 flex flex-col items-center border-b border-slate-800 relative">
        {/* Mobile Close Button */}
        <button 
          onClick={onClose}
          className="md:hidden absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Fechar menu"
        >
          <X className="w-5 h-5" />
        </button>

        <Logo 
          fallbackSize="sm" 
          className="h-11 w-auto mb-3 drop-shadow-xl"
        />
        <h1 className="text-base text-center font-bold text-white leading-tight">
          {SYSTEM_NAME}
        </h1>
        <p className="text-[10px] text-indigo-400 uppercase tracking-[0.2em] font-black mt-2">{SCHOOL_NAME}</p>
        <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">Sistema Escolar</p>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {menuItems.map((item) => {
          // Filtro por role
          if (!item.roles.includes(profile?.perfil || '')) return null;
          // Filtro por permissão específica (para usuários não admins)
          if (profile?.perfil !== 'admin' && item.perm) {
            if (!(profile as any)[item.perm]) return null;
          }

          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                isActive 
                  ? "bg-indigo-600 text-white" 
                  : "hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className={cn("mr-3 h-5 w-5", isActive ? "text-white" : "text-slate-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={() => {
            onClose();
            logout();
          }}
          className="flex items-center w-full px-4 py-2 text-sm font-medium text-slate-400 rounded-lg hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sair
        </button>
      </div>
    </div>
  );
}

