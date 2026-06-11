-- MIGRATION: 20260611000000_retroativo.sql
-- Adiciona suporte para lançamentos retroativos e tabela de configurações

-- 1. Alterar tabela de recibos para adicionar colunas de lançamento retroativo
ALTER TABLE public.recibos 
  ADD COLUMN IF NOT EXISTS data_lancamento DATE,
  ADD COLUMN IF NOT EXISTS lancamento_retroativo BOOLEAN DEFAULT FALSE;

-- 2. Criar a tabela configuracoes_sistema se não existir
CREATE TABLE IF NOT EXISTS public.configuracoes_sistema (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS em configuracoes_sistema
ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem para evitar conflitos
DROP POLICY IF EXISTS "Leitura de configurações por usuários autenticados" ON public.configuracoes_sistema;
DROP POLICY IF EXISTS "Admins podem atualizar configurações" ON public.configuracoes_sistema;

-- Criar novas políticas robustas
CREATE POLICY "Leitura de configurações por usuários autenticados"
  ON public.configuracoes_sistema FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins podem atualizar configurações"
  ON public.configuracoes_sistema FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios_perfis
      WHERE id = auth.uid() AND (perfil = 'admin'::public.usuarios_perfis_perfil OR perfil::text = 'admin')
    )
  );

-- Inserir valores padrões caso não existam
INSERT INTO public.configuracoes_sistema (chave, valor)
VALUES 
  ('retroativo_manha_habilitado', 'false'),
  ('retroativo_tarde_habilitado', 'false')
ON CONFLICT (chave) DO NOTHING;

-- 3. Atualizar a função RPC lancar_recibo_transacional
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
  p_itens JSONB,
  p_data_lancamento DATE DEFAULT NULL,
  p_lancamento_retroativo BOOLEAN DEFAULT FALSE
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
    created_at,
    data_lancamento,
    lancamento_retroativo
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
    NOW(),
    COALESCE(p_data_lancamento, CURRENT_DATE),
    p_lancamento_retroativo
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
      COALESCE(p_data_lancamento, CURRENT_DATE),
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
