-- MIGRATION: 20260521232838_solicitacoes_cancelamento.sql
-- Fluxo auditável de solicitação de cancelamento de recibos

CREATE TABLE IF NOT EXISTS public.solicitacoes_cancelamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recibo_id UUID NOT NULL REFERENCES public.recibos(id) ON DELETE CASCADE,
  numero_recibo TEXT NOT NULL,
  aluno_nome TEXT,
  aluno_turma TEXT,
  aluno_turno TEXT,
  solicitado_por_id UUID NOT NULL,
  solicitado_por_nome TEXT,
  solicitado_em TIMESTAMPTZ DEFAULT NOW(),
  motivo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'aprovada', 'recusada'
  analisado_por_id UUID,
  analisado_por_nome TEXT,
  analisado_em TIMESTAMPTZ,
  observacao_analise TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE public.solicitacoes_cancelamento ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
CREATE POLICY "Qualquer operador autenticado pode ler as solicitações de cancelamento"
  ON public.solicitacoes_cancelamento FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Qualquer operador pode inserir solicitações de cancelamento"
  ON public.solicitacoes_cancelamento FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = solicitado_por_id);

CREATE POLICY "Apenas administradores podem atualizar solicitações de cancelamento"
  ON public.solicitacoes_cancelamento FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios_perfis
      WHERE id = auth.uid() AND (perfil = 'admin'::public.usuarios_perfis_perfil OR perfil::text = 'admin')
    )
  );
