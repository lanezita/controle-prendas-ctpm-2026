import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User } from '@supabase/supabase-js';

export type Perfil = 'admin' | 'manha' | 'tarde' | 'consulta';
export type Turno = 'manha' | 'tarde' | 'ambos';

export interface UsuarioPerfil {
  id: string;
  nome: string;
  email?: string;
  perfil: Perfil;
  turno: Turno | null;
  pode_cadastrar_prendas: boolean;
  pode_cadastrar_campanhas: boolean;
  status: 'ativo' | 'inativo';
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UsuarioPerfil | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<{
    user: User | null;
    profile: UsuarioPerfil | null;
    loading: boolean;
  }>({
    user: null,
    profile: null,
    loading: true
  });

  useEffect(() => {
    // Verificação preventiva de sessão para mitigar e resolver erros de "Refresh Token Not Found"
    const verificarSessaoInicial = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Alerta na verificação preventiva de sessão:', error.message);
          if (
            error.message?.includes('Refresh Token') || 
            error.message?.includes('invalid_grant') || 
            error.message?.includes('not found')
          ) {
            // Limpa as chaves locais do Supabase para evitar loops e destravar o cliente
            for (const key of Object.keys(localStorage)) {
              if (key.startsWith('sb-')) {
                localStorage.removeItem(key);
              }
            }
            await supabase.auth.signOut();
            setState({ user: null, profile: null, loading: false });
          }
        }
      } catch (err) {
        console.error('Falha ao verificar sessão inicial preventivamente:', err);
      }
    };

    verificarSessaoInicial();

    // O onAuthStateChange do Supabase já busca a sessão inicial e monitora mudanças.
    // Usar um estado único (setState) garante que user e profile sejam atualizados 
    // atomicamente antes de liberar o loading.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      
      // Se não há usuário, limpa o estado
      if (!user) {
        setState({ user: null, profile: null, loading: false });
        return;
      }

      // Tratamento para caso o Supabase falte com erro de token
      // O 'session' pode vir nulo se houver erro interno no refresh
      
      try {
        const { data, error } = await supabase
          .from('usuarios_perfis')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          // Se o erro for de autenticação ou token, desloga o usuário
          if (error.message.includes('Refresh Token Not Found')) {
            console.warn('Sessão expirada. Redirecionando...');
            // Limpa chaves para evitar lock local
            for (const key of Object.keys(localStorage)) {
              if (key.startsWith('sb-')) {
                localStorage.removeItem(key);
              }
            }
            await supabase.auth.signOut();
            setState({ user: null, profile: null, loading: false });
            return;
          }
          console.error('Perfil não encontrado para o usuário:', user.email);
          setState({ user, profile: null, loading: false });
          return;
        }

        setState({ user, profile: data as UsuarioPerfil, loading: false });
      } catch (err) {
        console.error('Erro ao buscar perfil:', err);
        setState({ user, profile: null, loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    try {
      // Limpeza imediata no localStorage para evitar travamentos locais de token e sessões expiradas
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      }
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Erro ao chamar supabase.auth.signOut(), prosseguindo para limpeza local:', err);
    } finally {
      setState({ user: null, profile: null, loading: false });
    }
  };

  const contextValue = useMemo(() => ({
    user: state.user,
    profile: state.profile,
    loading: state.loading,
    logout
  }), [state.user, state.profile, state.loading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
