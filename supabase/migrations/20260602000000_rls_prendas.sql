-- MIGRATION: 20260602000000_rls_prendas.sql
-- Ajuste de políticas de Row Level Security (RLS) na tabela public.prendas

-- Garante que RLS está habilitado de forma segura na tabela de prendas
ALTER TABLE public.prendas ENABLE ROW LEVEL SECURITY;

-- 1. Política de seleção (SELECT) de prendas: qualquer usuário autenticado pode ler
DROP POLICY IF EXISTS "Leitura de prendas para qualquer usuário autenticado" ON public.prendas;
CREATE POLICY "Leitura de prendas para qualquer usuário autenticado"
  ON public.prendas FOR SELECT
  TO authenticated
  USING (true);

-- 2. Política de inserção (INSERT) de prendas: somente administradores ou operadores com permissão de cadastro
DROP POLICY IF EXISTS "Admins e operadores autorizados podem inserir prendas" ON public.prendas;
CREATE POLICY "Admins e operadores autorizados podem inserir prendas"
  ON public.prendas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios_perfis
      WHERE id = auth.uid() AND (perfil = 'admin'::public.usuarios_perfis_perfil OR perfil::text = 'admin' OR pode_cadastrar_prendas = true)
    )
  );

-- 3. Política de atualização (UPDATE) de prendas: somente administradores ou operadores com permissão
DROP POLICY IF EXISTS "Admins e operadores autorizados podem atualizar prendas" ON public.prendas;
CREATE POLICY "Admins e operadores autorizados podem atualizar prendas"
  ON public.prendas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios_perfis
      WHERE id = auth.uid() AND (perfil = 'admin'::public.usuarios_perfis_perfil OR perfil::text = 'admin' OR pode_cadastrar_prendas = true)
    )
  );
