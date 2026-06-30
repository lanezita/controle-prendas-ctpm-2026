-- MIGRATION: 20260630113000_cancelar_recibo_transacional.sql
-- FASE 3: RPC Transacional para Cancelamento Seguro de Recibos, Solicitações e Lançamentos

CREATE OR REPLACE FUNCTION public.cancelar_recibo_transacional(
  p_recibo_id UUID,
  p_usuario_id UUID,
  p_motivo TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_recibo_status TEXT;
  v_recibo_numero TEXT;
  v_usuario_nome TEXT;
  v_cancelado_por TEXT;
BEGIN
  -- 1. Validar que o recibo existe
  SELECT status, numero_recibo
  FROM public.recibos
  WHERE id = p_recibo_id
  INTO v_recibo_status, v_recibo_numero;

  IF v_recibo_numero IS NULL THEN
    RAISE EXCEPTION 'Recibo com ID % não encontrado.', p_recibo_id;
  END IF;

  -- 2. Validar se já está cancelado (idempotente)
  IF v_recibo_status = 'cancelado' THEN
    RETURN TRUE;
  END IF;

  -- 3. Obter nome do usuário analista/admin
  SELECT nome
  FROM public.usuarios_perfis
  WHERE id = p_usuario_id
  INTO v_usuario_nome;

  IF v_usuario_nome IS NULL THEN
    v_usuario_nome := 'Administrador';
  END IF;

  v_cancelado_por := v_usuario_nome || ' (Administrador)';

  -- 4. Atualizar o recibo
  UPDATE public.recibos
  SET status = 'cancelado',
      cancelado_por = v_cancelado_por,
      cancelado_em = NOW(),
      motivo_cancelamento = p_motivo
  WHERE id = p_recibo_id;

  -- 5. Atualizar a solicitação de cancelamento se existir e estiver pendente
  UPDATE public.solicitacoes_cancelamento_recibos
  SET status = 'aprovada',
      analisado_por = p_usuario_id,
      analisado_por_nome = v_usuario_nome,
      analisado_em = NOW(),
      observacao_admin = p_motivo
  WHERE recibo_id = p_recibo_id AND status = 'pendente';

  -- 6. Atualizar os lançamentos associados de forma segura
  UPDATE public.lancamentos
  SET status = 'cancelado',
      cancelado_por = v_cancelado_por,
      cancelado_em = NOW(),
      motivo_cancelamento = p_motivo,
      updated_at = NOW()
  WHERE numero_recibo = v_recibo_numero;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Relançar a exceção para garantir o rollback automático
    RAISE EXCEPTION 'Falha ao cancelar recibo transacional: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
