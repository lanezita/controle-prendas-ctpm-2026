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
    await supabase.auth.signOut();
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
