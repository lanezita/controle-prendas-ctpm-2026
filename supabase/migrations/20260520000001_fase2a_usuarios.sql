-- MIGRATION: 20260520000001_fase2a_usuarios.sql
-- FASE 2A: Políticas de RLS Avançadas e Ajustes na Tabela de Perfis de Usuários

-- =====================================================================
-- CORREÇÃO DE POLÍTICA RLS PARA USUARIOS_PERFIS (Administração)
-- =====================================================================

-- 1. Remove qualquer política anterior restritiva de update para evitar conflito
DROP POLICY IF EXISTS "Apenas operadores podem atualizar seu próprio perfil" ON public.usuarios_perfis;
DROP POLICY IF EXISTS "Admins podem atualizar qualquer perfil e donos podem atualizar apenas seu próprio perfil" ON public.usuarios_perfis;

-- 2. Cria nova política robusta de update:
-- - Permite que qualquer usuário autenticado edite seu próprio registro (ex: nome)
-- - Permite que qualquer administrador logado edite qualquer registro
CREATE POLICY "Admins podem atualizar qualquer perfil e donos podem atualizar apenas seu próprio perfil"
  ON public.usuarios_perfis
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.usuarios_perfis
      WHERE id = auth.uid() AND (perfil = 'admin'::public.usuarios_perfis_perfil OR perfil::text = 'admin')
    )
  );
