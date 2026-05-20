-- MIGRATION: 20260520000000_fase1_integridade.sql
-- FASE 1: Correções Críticas de Integridade e Persistência do Sistema Prendas 2026

-- =====================================================================
-- CORREÇÃO 1: Numeração sequencial atômica de recibos no Supabase
-- =====================================================================

-- 1. Criação do SEQUENCE de numeração oficial de recibos (formato sequencial de ID)
CREATE SEQUENCE IF NOT EXISTS public.recibo_numero_seq
  START WITH 4  -- Inicia do 4 já que os mocks usam 1, 2, 3
  INCREMENT BY 1
  NO MAXVALUE
  NO MINVALUE
  CACHE 1;

-- =====================================================================
-- CORREÇÃO 2 & 3: Campos adicionados para auditoria de cancelamento e campanhas
-- =====================================================================

-- 1. Tabela de Recibos: adicionar campos de auditoria de cancelamento
ALTER TABLE public.recibos 
  ADD COLUMN IF NOT EXISTS cancelado_por TEXT,
  ADD COLUMN IF NOT EXISTS cancelado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motivo_cancelamento TEXT;

-- 2. Tabela de Lançamentos: adicionar campos de cancelamento e ID de campanha aplicada
ALTER TABLE public.lancamentos
  ADD COLUMN IF NOT EXISTS cancelado_por TEXT,
  ADD COLUMN IF NOT EXISTS cancelado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motivo_cancelamento TEXT,
  ADD COLUMN IF NOT EXISTS campanha_relampago_id UUID;


-- =====================================================================
-- CORREÇÃO 1 & 3: Função Transacional RPC para Geração Atômica de Recibos
-- =====================================================================

CREATE OR REPLACE FUNCTION public.lancar_recibo_transacional(
  p_aluno_id UUID,
  p_aluno_matricula VARCHAR,
  p_aluno_nome VARCHAR,
  p_aluno_turma VARCHAR,
  p_turno_aluno VARCHAR,
  p_total_pontos INT,
  p_usuario_id UUID,
  p_usuario_nome VARCHAR,
  p_usuario_perfil VARCHAR,
  p_observacao TEXT,
  p_itens JSONB
)
RETURNS JSONB AS $$
DECLARE
  novo_numero TEXT;
  novo_recibo_id UUID;
  item_record RECORD;
BEGIN
  -- 1. Obter próximo sequencial de forma atômica e segura contra concorrência
  SELECT '2026-' || LPAD(nextval('public.recibo_numero_seq')::TEXT, 4, '0') INTO novo_numero;
  
  -- 2. Gerar ID UID exclusivo e seguro para o recibo
  novo_recibo_id := gen_random_uuid();
  
  -- 3. Inserir o Recibo unificado
  INSERT INTO public.recibos (
    id,
    numero_recibo,
    data_geracao,
    status,
    aluno_id,
    aluno_matricula,
    aluno_nome,
    aluno_turma,
    aluno_turno,
    usuario_id,
    usuario_responsavel_nome,
    usuario_responsavel_perfil,
    total_pontos,
    observacao,
    created_at
  ) VALUES (
    novo_recibo_id,
    novo_numero,
    NOW(),
    'ativo',
    p_aluno_id,
    p_aluno_matricula,
    p_aluno_nome,
    p_aluno_turma,
    p_turno_aluno,
    p_usuario_id,
    p_usuario_nome,
    p_usuario_perfil,
    p_total_pontos,
    p_observacao,
    NOW()
  );

  -- 4. Inserir cada lançamento iterando sobre os itens fornecidos
  FOR item_record IN SELECT * FROM jsonb_to_recordset(p_itens) AS x(
    prenda_id UUID,
    nome_prenda VARCHAR,
    tipo_prenda VARCHAR,
    quantidade INT,
    pontos_base INT,
    prenda_relampago VARCHAR,
    multiplicador INT,
    total_pontos INT,
    campanha_relampago_id UUID
  ) LOOP
    
    INSERT INTO public.lancamentos (
      id,
      numero_recibo,
      data_lancamento,
      aluno_id,
      matricula,
      nome_aluno,
      turma,
      ano_serie,
      turno,
      prenda_id,
      nome_prenda,
      tipo_prenda,
      quantidade,
      pontos_base,
      prenda_relampago,
      multiplicador,
      total_pontos,
      campanha_relampago_id,
      observacao,
      usuario_responsavel,
      status,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      novo_numero,
      CURRENT_DATE,
      p_aluno_id,
      p_aluno_matricula,
      p_aluno_nome,
      p_aluno_turma,
      'EFAI',
      p_turno_aluno,
      item_record.prenda_id,
      item_record.nome_prenda,
      item_record.tipo_prenda,
      item_record.quantidade,
      item_record.pontos_base,
      item_record.prenda_relampago,
      item_record.multiplicador,
      item_record.total_pontos,
      item_record.campanha_relampago_id,
      p_observacao,
      p_usuario_nome,
      'valido',
      NOW(),
      NOW()
    );
  END LOOP;

  -- 5. Retornar os dados oficiais atribuídos para atualização no cache frontend
  RETURN jsonb_build_object(
    'id', novo_recibo_id,
    'numero_recibo', novo_numero,
    'data_geracao', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================================
-- CORREÇÃO 5: Preparação Segura para RLS (Row Level Security)
-- =====================================================================

-- Habilitar RLS em tabelas fundamentais
ALTER TABLE public.usuarios_perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recibos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;

-- 1. Políticas de usuários_perfis (Identificado chave de ligação como 'id', mesmo UUID do auth.users)

CREATE POLICY "Qualquer operador autenticado pode ler os perfis" 
  ON public.usuarios_perfis FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Apenas operadores podem atualizar seu próprio perfil" 
  ON public.usuarios_perfis FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id);

-- 2. Políticas para Recibos

CREATE POLICY "Leitura de Recibos protegida por turno" 
  ON public.recibos FOR SELECT 
  TO authenticated 
  USING (
    -- Admins têm acesso total
    EXISTS (
      SELECT 1 FROM public.usuarios_perfis 
      WHERE id = auth.uid() AND perfil = 'admin'
    )
    OR 
    -- Operadores veem apenas recibos de alunos do seu próprio turno relacionado
    EXISTS (
      SELECT 1 FROM public.usuarios_perfis 
      WHERE id = auth.uid() AND UPPER(turno) = UPPER(aluno_turno)
    )
  );

CREATE POLICY "Inserção de Recibos autenticada generalizada" 
  ON public.recibos FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Apenas admins podem cancelar/alterar recibos" 
  ON public.recibos FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios_perfis 
      WHERE id = auth.uid() AND perfil = 'admin'
    )
  );

-- 3. Políticas para Lançamentos

CREATE POLICY "Leitura de Lançamentos por Turno" 
  ON public.lancamentos FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios_perfis 
      WHERE id = auth.uid() AND perfil = 'admin'
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.usuarios_perfis 
      WHERE id = auth.uid() AND UPPER(turno) = UPPER(lancamentos.turno)
    )
  );

CREATE POLICY "Inserção de Lançamentos autenticada" 
  ON public.lancamentos FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Apenas admins podem alterar ou marcar cancelado em lançamentos" 
  ON public.lancamentos FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios_perfis 
      WHERE id = auth.uid() AND perfil = 'admin'
    )
  );
