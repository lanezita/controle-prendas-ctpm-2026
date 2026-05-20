/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import { AlertTriangle, Key, ArrowRight, RefreshCw } from 'lucide-react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Lancamento } from './pages/Lancamento';
import { ReciboView } from './pages/ReciboView';
import { ConsultaRecibos } from './pages/ConsultaRecibos';
import { Ranking } from './pages/Ranking';
import { Login } from './pages/Login';
import { Alunos } from './pages/Alunos';
import { Prendas } from './pages/Prendas';
import { Campanhas } from './pages/Campanhas';
import { Usuarios } from './pages/Usuarios';

function AppRoutes() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  // Se o usuário está autenticado mas não tem perfil ou está inativo
  if (user && (!profile || profile.status === 'inativo')) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-2xl">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Acesso Não Autorizado</h2>
          <p className="text-slate-600 mb-6">
            {!profile 
              ? `Seu usuário (${user.email}) não possui um perfil configurado no sistema.` 
              : `A conta associada ao e-mail (${user.email}) está atualmente inativa.`}
            <br />
            Por favor, entre em contato com o administrador da gincana se achar que é um erro.
          </p>
          <button 
            onClick={() => supabase.auth.signOut()}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Sair da Conta
          </button>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Só redireciona do login se tiver user E profile */}
      <Route path="/login" element={!(user && profile) ? <Login /> : <Navigate to="/" replace />} />
      
      <Route path="/" element={user && profile ? <Layout /> : <Navigate to="/login" replace />}>
        <Route index element={<Dashboard />} />
        <Route path="lancamento" element={<Lancamento />} />
        <Route path="recibo/:id" element={<ReciboView />} />
        <Route path="recibos" element={<ConsultaRecibos />} />
        <Route path="ranking" element={<Ranking />} />
        <Route path="alunos" element={<Alunos />} />
        <Route path="prendas" element={<Prendas />} />
        
        {/* View de Cadastros simplificada para V1 */}
        <Route path="campanhas" element={<Campanhas />} />
        <Route path="turmas" element={<Placeholder title="Turmas" />} />
        <Route path="usuarios" element={<Usuarios />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Placeholder de paginas para cadastros
const Placeholder = ({ title }: { title: string }) => (
  <div>
    <h1 className="text-2xl font-semibold text-slate-800 mb-6">{title}</h1>
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <p className="text-slate-500">Módulo em construção (em breve disponível no Supabase)...</p>
    </div>
  </div>
);

function MissingEnvScreen() {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 font-sans select-none">
      <div className="max-w-xl w-full bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-2xl relative overflow-hidden text-slate-800">
        <div className="relative flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-3xl flex items-center justify-center mb-6 text-amber-500 animate-pulse">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-2">Ajuste de Configuração Necessário</span>
          <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 mb-4">
            Banco de Dados Não Conectado
          </h1>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-8 font-medium">
            O sistema de arrecadação de gincanas requer as credenciais do Supabase para funcionar de forma persistente.
          </p>

          <div className="w-full text-left bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-4 mb-8">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-600" />
              O que você precisa fazer?
            </h2>
            
            <div className="space-y-3.5">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 bg-indigo-50 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 text-indigo-600">1</span>
                <div>
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">Obter Credenciais no Supabase</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Acesse o painel do seu projeto no Supabase, vá em <strong className="text-slate-900">Project Settings &gt; API</strong> e copie a <strong className="text-indigo-600">Project URL</strong> e a <strong className="text-indigo-600">anon public key</strong>.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 bg-indigo-50 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 text-indigo-600">2</span>
                <div>
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">Adicionar no Painel do AI Studio</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">No menu do <strong className="text-slate-900">AI Studio Build</strong> ao lado (ou nas configurações), adicione secrets com as chaves:</p>
                  <div className="mt-2 grid grid-cols-1 gap-1 font-mono text-[10px] bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-slate-300 col-span-1">
                    <span className="flex items-center gap-1.5"><ArrowRight className="w-3 h-3 text-slate-550" />VITE_SUPABASE_URL</span>
                    <span className="flex items-center gap-1.5"><ArrowRight className="w-3 h-3 text-slate-550" />VITE_SUPABASE_ANON_KEY</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            <button
              onClick={handleReload}
              className="w-full justify-center flex items-center px-6 py-3.5 bg-indigo-600 hover:bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-indigo-100"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Recarregar Aplicativo
            </button>
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full justify-center flex items-center px-6 py-3.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
            >
              Ir para o Supabase
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  if (!isSupabaseConfigured) {
    return <MissingEnvScreen />;
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
