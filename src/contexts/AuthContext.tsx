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
  error: string | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<{
    user: User | null;
    profile: UsuarioPerfil | null;
    loading: boolean;
    error: string | null;
  }>({
    user: null,
    profile: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    // Safety timer to prevent getting stuck on infinite spinner
    const safetyTimer = setTimeout(() => {
      setState((prev) => {
        if (prev.loading) {
          console.warn('Timeout de inicialização do Supabase Auth atingido (6s). Liberando interface.');
          return { ...prev, loading: false, error: 'O tempo limite de conexão expirou. Algumas funções podem estar indisponíveis ou lentas.' };
        }
        return prev;
      });
    }, 6000);

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
            setState({ user: null, profile: null, loading: false, error: 'Sessão expirada. Faça login novamente.' });
          } else {
            setState((prev) => ({ ...prev, error: error.message }));
          }
        } else if (!session) {
          setState({ user: null, profile: null, loading: false, error: null });
        }
      } catch (err: any) {
        console.error('Falha ao verificar sessão inicial preventivamente:', err);
        setState({ user: null, profile: null, loading: false, error: err?.message || 'Erro de conexão inicial.' });
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
        clearTimeout(safetyTimer);
        setState({ user: null, profile: null, loading: false, error: null });
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

        clearTimeout(safetyTimer);

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
            setState({ user: null, profile: null, loading: false, error: 'Sessão expirada. Por favor, conecte-se novamente.' });
            return;
          }
          console.error('Perfil não encontrado para o usuário:', user.email);
          setState({ user, profile: null, loading: false, error: 'Seu perfil de usuário não foi encontrado no banco de dados. Contate um administrador.' });
          return;
        }

        setState({ user, profile: data as UsuarioPerfil, loading: false, error: null });
      } catch (err: any) {
        clearTimeout(safetyTimer);
        console.error('Erro ao buscar perfil:', err);
        setState({ user, profile: null, loading: false, error: err?.message || 'Erro ao carregar perfil do utilizador.' });
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
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
      setState({ user: null, profile: null, loading: false, error: null });
    }
  };

  const contextValue = useMemo(() => ({
    user: state.user,
    profile: state.profile,
    loading: state.loading,
    error: state.error,
    logout
  }), [state.user, state.profile, state.loading, state.error]);

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
