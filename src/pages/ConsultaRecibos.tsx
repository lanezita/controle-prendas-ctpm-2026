import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ReciboView } from './ReciboView';
import { 
  mockRecibos, 
  mockAlunos, 
  mockTurmas, 
  cancelMockRecibo, 
  SolicitacaoCancelamento, 
  mockSolicitacoes, 
  addSolicitacaoCancelamento, 
  processarAnaliseSolicitacao, 
  fetchSolicitacoesCancelamentoFromDB,
  fetchRecibosFromDB,
  Recibo
} from '../lib/mock-data';
import { formatPoints } from '../lib/utils';
import { Search, Eye, Ban, Filter, AlertCircle, Shield, Check, X, Loader2, Printer } from 'lucide-react';

export function ConsultaRecibos() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [busca, setBusca] = useState('');
  const [recibosList, setRecibosList] = useState<Recibo[]>([]);
  const [solicitacoesList, setSolicitacoesList] = useState<SolicitacaoCancelamento[]>(mockSolicitacoes);
  const [loading, setLoading] = useState(true);
  const [errorFetch, setErrorFetch] = useState<string | null>(null);

  // Estados para filtros
  const [filtroTurma, setFiltroTurma] = useState('');
  const [filtroTurno, setFiltroTurno] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');

  const [tempTurma, setTempTurma] = useState('');
  const [tempTurno, setTempTurno] = useState('');
  const [tempStatus, setTempStatus] = useState('todos');

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Estado para visualização de recibo em modal
  const [reciboVisualizarId, setReciboVisualizarId] = useState<string | null>(null);

  // Estado para seleção múltipla de recibos
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  // Carrega as solicitações e recibos do Supabase se disponível ou lê do cache local
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setErrorFetch(null);
      
      // Fetch receipts safely
      try {
        const resRecibos = await fetchRecibosFromDB();
        setRecibosList([...resRecibos]);
      } catch (err: any) {
        console.error('Erro ao buscar recibos do Supabase:', err);
        setErrorFetch('Não foi possível carregar os recibos do banco de dados: ' + (err?.message || String(err)));
      }

      // Fetch cancel requests safely and separately
      try {
        const resSols = await fetchSolicitacoesCancelamentoFromDB();
        if (resSols) {
          setSolicitacoesList([...resSols]);
        }
      } catch (err) {
        console.error('Erro ao buscar solicitações de cancelamento do Supabase:', err);
      }

      setLoading(false);
    }
    loadData();
  }, []);

  // Limpa seleção ao alterar os filtros ou buscas
  useEffect(() => {
    setSelectedRows([]);
  }, [filtroTurma, filtroTurno, filtroStatus, busca]);

  // Estados para Auditoria de Cancelamento Direto do Admin
  const [modalCancelamentoOpen, setModalCancelamentoOpen] = useState(false);
  const [reciboParaCancelar, setReciboParaCancelar] = useState<{ id: string, numero: string } | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [erroCancelamento, setErroCancelamento] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Estados para Solicitação de Cancelamento do Operador
  const [modalSolicitarOpen, setModalSolicitarOpen] = useState(false);
  const [reciboParaSolicitar, setReciboParaSolicitar] = useState<any>(null);
  const [motivoSolicitacao, setMotivoSolicitacao] = useState('');
  const [erroSolicitacao, setErroSolicitacao] = useState('');
  const [alertaDuplicidade, setAlertaDuplicidade] = useState('');

  // Estados para Análise do Admin
  const [modalAnaliseOpen, setModalAnaliseOpen] = useState(false);
  const [solicitacaoEmAnalise, setSolicitacaoEmAnalise] = useState<SolicitacaoCancelamento | null>(null);
  const [observacaoAnalise, setObservacaoAnalise] = useState('');
  const [erroAnalise, setErroAnalise] = useState('');
  const [isAnalysing, setIsAnalysing] = useState(false);

  // Handler para cancelar diretamente (admin)
  const handleCancelarClick = (id: string, numero: string) => {
    setReciboParaCancelar({ id, numero });
    setMotivoCancelamento('');
    setErroCancelamento('');
    setModalCancelamentoOpen(true);
  };

  const confirmarCancelamento = async () => {
    if (!motivoCancelamento.trim()) {
      setErroCancelamento('O motivo do cancelamento é obrigatório.');
      return;
    }
    if (reciboParaCancelar && profile) {
      try {
        setIsCancelling(true);
        setErroCancelamento('');
        const canceladoPor = `${profile.nome} (Administrador)`;
        
        // cancelMockRecibo returns CancelReciboResult indicating actual success and details
        const result = await cancelMockRecibo(reciboParaCancelar.id, canceladoPor, motivoCancelamento.trim());
        
        if (result.success) {
          // Force a secure reload/sync from Supabase database to guarantee accurate UI matches DB
          const resRecibos = await fetchRecibosFromDB();
          setRecibosList([...resRecibos]);
          
          setModalCancelamentoOpen(false);
          setReciboParaCancelar(null);
          setMotivoCancelamento('');
        } else {
          setErroCancelamento(`Falha na ${result.errorStage || 'etapa'}: ${result.errorMessage || 'Falha ao persistir cancelamento no Supabase.'}`);
        }
      } catch (err: any) {
        setErroCancelamento('Erro inesperado: ' + (err?.message || String(err)));
      } finally {
        setIsCancelling(false);
      }
    }
  };

  // Handler para solicitar cancelamento (operadores)
  const handleSolicitarClick = (recibo: any) => {
    // Validar duplicidade nas solicitações ativas
    const temPendente = solicitacoesList.some(s => s.recibo_id === recibo.id && s.status === 'pendente');
    if (temPendente) {
      setAlertaDuplicidade('Já existe uma solicitação de cancelamento pendente para este recibo.');
      return;
    }
    setAlertaDuplicidade('');
    setReciboParaSolicitar(recibo);
    setMotivoSolicitacao('');
    setErroSolicitacao('');
    setModalSolicitarOpen(true);
  };

  const confirmarSolicitacao = async () => {
    if (!motivoSolicitacao.trim()) {
      setErroSolicitacao('O motivo do cancelamento é obrigatório.');
      return;
    }
    if (motivoSolicitacao.trim().length < 10) {
      setErroSolicitacao('O motivo deve conter no mínimo 10 caracteres.');
      return;
    }
    if (reciboParaSolicitar && profile) {
      const aluno = mockAlunos.find(a => a.id === reciboParaSolicitar.alunoId);
      const turma = mockTurmas.find(t => t.id === reciboParaSolicitar.turmaId);
      
      await addSolicitacaoCancelamento({
        recibo_id: reciboParaSolicitar.id,
        numero_recibo: reciboParaSolicitar.numero,
        aluno_nome: reciboParaSolicitar.aluno_nome || aluno?.nome || 'Aluno Desconhecido',
        aluno_turma: reciboParaSolicitar.aluno_turma || turma?.nome || reciboParaSolicitar.turmaId || '',
        aluno_turno: reciboParaSolicitar.aluno_turno || reciboParaSolicitar.turno,
        solicitado_por_id: profile.id,
        solicitado_por_nome: profile.nome,
        motivo: motivoSolicitacao.trim()
      });

      // Recarrega estados
      setSolicitacoesList([...mockSolicitacoes]);
      setModalSolicitarOpen(false);
      setReciboParaSolicitar(null);
      setMotivoSolicitacao('');
    }
  };

  // Handlers para analisar solicitação (admin)
  const handleAnalisarClick = (sol: SolicitacaoCancelamento) => {
    setSolicitacaoEmAnalise(sol);
    setObservacaoAnalise('');
    setModalAnaliseOpen(true);
  };

  const confirmarAnalise = async (novoStatus: 'aprovada' | 'recusada') => {
    if (!solicitacaoEmAnalise || !profile) return;

    try {
      setIsAnalysing(true);
      setErroAnalise('');
      
      const result = await processarAnaliseSolicitacao(
        solicitacaoEmAnalise.id,
        novoStatus,
        profile.id,
        profile.nome,
        observacaoAnalise.trim()
      );

      if (result.success) {
        // Force a secure reload/sync from Supabase database to guarantee accurate UI matches DB
        console.log('[CANCEL_AUDIT] [ETAPA 5] Refetch de recibos...');
        const resRecibos = await fetchRecibosFromDB();
        setRecibosList([...resRecibos]);
        
        console.log('[CANCEL_AUDIT] [ETAPA 6] Refetch de solicitações...');
        const resSols = await fetchSolicitacoesCancelamentoFromDB();
        if (resSols) {
          setSolicitacoesList([...resSols]);
        }
        
        setModalAnaliseOpen(false);
        setSolicitacaoEmAnalise(null);
        setObservacaoAnalise('');
      } else {
        setErroAnalise(`Falha na ${result.errorStage || 'etapa'}: ${result.errorMessage || 'Falha ao registrar a decisão de cancelamento no Supabase.'}`);
      }
    } catch (err: any) {
      setErroAnalise('Erro inesperado: ' + (err?.message || String(err)));
    } finally {
      setIsAnalysing(false);
    }
  };

  const getTurnoNormalizado = (t: string | undefined | null): string => {
    if (!t) return '';
    const lower = t.toLowerCase().trim();
    if (lower === 'manhã' || lower === 'manha' || lower === 'matutino') return 'manha';
    if (lower === 'tarde' || lower === 'vespertino') return 'tarde';
    return lower;
  };

  // Mapeamento do Turno de atuação com tratamento seguro
  const userTurno = getTurnoNormalizado(profile?.turno || (profile?.perfil === 'manha' ? 'manha' : profile?.perfil === 'tarde' ? 'tarde' : null));

  // Handlers para aplicar e limpar os filtros
  const handleApplyFilters = async (turma: string, turno: string, status: string) => {
    setIsApplying(true);
    setFiltroTurma(turma);
    setFiltroTurno(turno);
    setFiltroStatus(status);
    
    try {
      const resRecibos = await fetchRecibosFromDB();
      setRecibosList([...resRecibos]);
    } catch (err) {
      console.error('Erro ao atualizar recibos:', err);
    } finally {
      setIsApplying(false);
      setIsFiltersOpen(false);
    }
  };

  const handleClearFilters = async () => {
    setIsApplying(true);
    setTempTurma('');
    setTempTurno('');
    setTempStatus('todos');
    
    setFiltroTurma('');
    setFiltroTurno('');
    setFiltroStatus('todos');
    
    try {
      const resRecibos = await fetchRecibosFromDB();
      setRecibosList([...resRecibos]);
    } catch (err) {
      console.error('Erro ao limpar filtros e carregar recibos:', err);
    } finally {
      setIsApplying(false);
      setIsFiltersOpen(false);
    }
  };

  // Filtragem de Recibos de acordo com regras de turno e permissões
  const baseRecibos = profile?.perfil === 'admin' || profile?.perfil === 'consulta'
    ? recibosList 
    : recibosList.filter(r => {
        const turnoRec = getTurnoNormalizado(r.aluno_turno || r.turno);
        return turnoRec === userTurno;
      });

  const recibosFiltrados = baseRecibos.filter(r => {
    // 1. Filtro de busca por texto
    if (busca) {
      const searchLower = busca.toLowerCase();
      const aluno = mockAlunos.find(a => a.id === r.alunoId);
      const nomeAluno = (r.aluno_nome || aluno?.nome || '').toLowerCase();
      const matriculaAluno = r.aluno_matricula || aluno?.matricula || '';
      
      const matchBusca = (
        String(r.numero ?? r.numero_recibo ?? '').toLowerCase().includes(searchLower) ||
        nomeAluno.includes(searchLower) ||
        matriculaAluno.includes(searchLower)
      );
      if (!matchBusca) return false;
    }

    // 2. Filtro de Turma
    if (filtroTurma) {
      const turma = mockTurmas.find(t => t.id === r.turmaId);
      const turmaNome = r.aluno_turma || turma?.nome || r.turmaId || '';
      const matchTurma = (
        r.turmaId === filtroTurma || 
        turmaNome.toLowerCase() === filtroTurma.toLowerCase()
      );
      if (!matchTurma) return false;
    }

    // 3. Filtro de Turno (SÓ renderizado/aplicado para admin/consulta)
    if ((profile?.perfil === 'admin' || profile?.perfil === 'consulta') && filtroTurno) {
      const rTurno = getTurnoNormalizado(r.aluno_turno || r.turno);
      if (rTurno !== filtroTurno) return false;
    }

    // 4. Filtro de Status
    if (filtroStatus && filtroStatus !== 'todos') {
      if (r.status.toLowerCase() !== filtroStatus.toLowerCase()) return false;
    }

    return true;
  });

  // Elementos selecionáveis (ativos e filtrados)
  const selectableRecibos = recibosFiltrados.filter(
    r => r.status.toLowerCase() !== 'cancelado'
  );

  const selectedActiveRecibos = recibosFiltrados.filter(
    r => r.status.toLowerCase() === 'ativo' && selectedRows.includes(r.id)
  );

  const temSelecaoAtiva = selectedRows.length > 0;

  const totalAtivosFiltrados = recibosFiltrados
    .filter(r => r.status.toLowerCase() === 'ativo')
    .reduce((acc, r) => acc + (Number(r.total_pontos) || 0), 0);

  // Somatório dinâmico considerando a seleção ou todos os ativos filtrados
  const somaTotalPontos = temSelecaoAtiva
    ? selectedActiveRecibos.reduce((acc, r) => acc + (Number(r.total_pontos) || 0), 0)
    : totalAtivosFiltrados;

  const areAllSelected = selectableRecibos.length > 0 && selectableRecibos.every(r => selectedRows.includes(r.id));
  const areSomeSelected = selectableRecibos.length > 0 && selectableRecibos.some(r => selectedRows.includes(r.id)) && !areAllSelected;

  return (
    <div 
      id={reciboVisualizarId ? undefined : "print-area"} 
      className="space-y-6 print:block print:visible print:h-auto print:overflow-visible print:w-full print:bg-white print:text-black print:[print-color-adjust:exact] print:pb-24"
    >
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold text-slate-800">Consulta de Recibos</h1>
      </div>

      {/* Cabeçalho exclusivo para impressão (espelho de auditoria) */}
      <div className="hidden print:block border-b border-slate-200 pb-2 text-xs text-slate-500 mb-2">
        <p className="font-bold text-slate-800 text-sm mb-1">Espelho de Auditoria de Recibos</p>
        <div className="flex justify-between items-center">
          <span>Gerado por: <strong className="text-slate-700">{profile?.nome || 'Usuário'} ({profile?.perfil === 'admin' ? 'Administrador' : profile?.perfil === 'consulta' ? 'Consulta' : `Operador ${profile?.perfil === 'manha' ? 'Manhã' : 'Tarde'}`})</strong></span>
          <span>Data de Emissão: <strong className="text-slate-700">{new Date().toLocaleString('pt-BR')}</strong></span>
        </div>
      </div>

      {/* PAINEL ADMIN: Solicitações de Cancelamento Pendentes */}
      {profile?.perfil === 'admin' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4 print:hidden">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">Solicitações de Cancelamento Pendentes</h2>
          </div>
          
          {solicitacoesList.filter(s => s.status === 'pendente').length === 0 ? (
            <p className="text-sm text-slate-500 italic">Não há solicitações de cancelamento pendentes no momento.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap border border-slate-100 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 text-slate-600 font-medium">
                  <tr>
                    <th className="px-4 py-3 border-b border-slate-200">Recibo</th>
                    <th className="px-4 py-3 border-b border-slate-200">Aluno</th>
                    <th className="px-4 py-3 border-b border-slate-200">Turma/Turno</th>
                    <th className="px-4 py-3 border-b border-slate-200">Operador Solicitante</th>
                    <th className="px-4 py-3 border-b border-slate-200">Motivo</th>
                    <th className="px-4 py-3 border-b border-slate-200">Data Solicitação</th>
                    <th className="px-4 py-3 border-b border-slate-200 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {solicitacoesList.filter(s => s.status === 'pendente').map(s => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-indigo-600">#{s.numero_recibo}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{s.aluno_nome}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {s.aluno_turma}
                        <span className="block text-xs text-slate-500 capitalize">{s.aluno_turno}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{s.solicitado_por_nome}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={s.motivo}>
                        {s.motivo}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(s.solicitado_em).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleAnalisarClick(s)}
                          className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          Analisar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Caixa de Busca */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-4 print:border-none print:shadow-none print:bg-transparent print:p-0 print:space-y-0 print:m-0">
        <div className="flex flex-col sm:flex-row gap-4 print:hidden">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar por número, aluno ou matrícula..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>
          <button 
            onClick={() => {
              setTempTurma(filtroTurma);
              setTempTurno(filtroTurno);
              setTempStatus(filtroStatus);
              setIsFiltersOpen(true);
            }}
            className={`flex items-center justify-center px-4 py-2.5 rounded-lg border transition-all cursor-pointer w-full sm:w-auto ${
              filtroTurma || filtroTurno || filtroStatus !== 'todos'
                ? 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 font-bold shadow-sm shadow-indigo-100'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
          >
            <Filter className="h-4 w-4 mr-2" /> Filtros
            {(filtroTurma || filtroTurno || filtroStatus !== 'todos') && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-white text-indigo-700 rounded-full font-black">
                !
              </span>
            )}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center px-4 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg border border-slate-900 transition-all cursor-pointer w-full sm:w-auto font-bold"
          >
            <Printer className="h-4 w-4 mr-2" /> Imprimir Espelho
          </button>
        </div>

        {/* Badges de filtros ativos */}
        {(filtroTurma || filtroTurno || filtroStatus !== 'todos') ? (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 animate-in fade-in duration-200 print:border-none print:pt-0">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Filtros ativos:</span>
            {filtroTurma && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100">
                Turma: {filtroTurma}
                <button 
                  onClick={() => {
                    setFiltroTurma('');
                    setTempTurma('');
                  }} 
                  className="hover:text-indigo-900 cursor-pointer ml-0.5 print:hidden"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filtroTurno && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100">
                Turno: {filtroTurno === 'manha' ? 'Manhã' : 'Tarde'}
                <button 
                  onClick={() => {
                    setFiltroTurno('');
                    setTempTurno('');
                  }} 
                  className="hover:text-indigo-900 cursor-pointer ml-0.5 print:hidden"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filtroStatus !== 'todos' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100">
                Status: {filtroStatus === 'ativo' ? 'Ativos' : 'Cancelados'}
                <button 
                  onClick={() => {
                    setFiltroStatus('todos');
                    setTempStatus('todos');
                  }} 
                  className="hover:text-indigo-900 cursor-pointer ml-0.5 print:hidden"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <button 
              onClick={handleClearFilters}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer ml-1 print:hidden"
            >
              Limpar tudo
            </button>
          </div>
        ) : (
          <div className="hidden print:block text-xs text-slate-400 italic pt-1">
            Nenhum filtro aplicado. Exibindo todos os recibos disponíveis para o seu nível de acesso.
          </div>
        )}
      </div>

      {errorFetch && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl font-bold text-sm">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <span>{errorFetch}</span>
        </div>
      )}

      {/* Listagem Geral de Recibos */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none print:bg-transparent print:w-full print:block print:overflow-visible">
        <div className="overflow-x-auto print:overflow-visible print:w-full print:block">
          <table className="w-full text-left text-sm whitespace-nowrap print:w-full print:table print:overflow-visible">
            <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-12 print:hidden">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                    checked={areAllSelected}
                    ref={el => {
                      if (el) {
                        el.indeterminate = areSomeSelected;
                      }
                    }}
                    onChange={() => {
                      if (areAllSelected) {
                        setSelectedRows(prev => prev.filter(id => !selectableRecibos.some(r => r.id === id)));
                      } else {
                        setSelectedRows(prev => {
                          const next = [...prev];
                          selectableRecibos.forEach(r => {
                            if (!next.includes(r.id)) {
                              next.push(r.id);
                            }
                          });
                          return next;
                        });
                      }
                    }}
                  />
                </th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Nº Recibo</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Aluno</th>
                <th className="px-6 py-4">Turma/Turno</th>
                <th className="px-6 py-4 text-right">Pts</th>
                <th className="px-6 py-4 text-right print:hidden">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                      <span>Carregando recibos...</span>
                    </div>
                  </td>
                </tr>
              ) : recibosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    Nenhum recibo encontrado.
                  </td>
                </tr>
              ) : (
                recibosFiltrados.map(r => {
                  const aluno = mockAlunos.find(a => a.id === r.alunoId);
                  const turma = mockTurmas.find(t => t.id === r.turmaId);
                  const nomeAluno = r.aluno_nome || aluno?.nome || 'Aluno Desconhecido';
                  const matriculaAluno = r.aluno_matricula || aluno?.matricula || '';
                  const turmaNome = r.aluno_turma || turma?.nome || r.turmaId || '';
                  const turnoExibicao = r.aluno_turno || r.turno;

                  // Verifica se este recibo tem uma solicitação pendente
                  const request = solicitacoesList.find(s => s.recibo_id === r.id && s.status === 'pendente');
                  const temSolicitacaoPendente = !!request;
                  
                  return (
                    <tr 
                      key={r.id} 
                      className="hover:bg-slate-50 cursor-pointer transition-colors print:break-inside-avoid"
                      onClick={() => setReciboVisualizarId(r.id)}
                    >
                      <td className="px-6 py-4 w-12 print:hidden" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          disabled={r.status.toLowerCase() === 'cancelado'}
                          checked={selectedRows.includes(r.id)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            if (checked) {
                              setSelectedRows(prev => [...prev, r.id]);
                            } else {
                              setSelectedRows(prev => prev.filter(id => id !== r.id));
                            }
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </td>
                      <td className="px-6 py-4">
                        {temSolicitacaoPendente ? (
                          <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            Cancelamento solicitado
                          </span>
                        ) : r.status.toLowerCase() === 'ativo' ? (
                          <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                            Cancelado
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">#{r.numero}</td>
                      <td className="px-6 py-4 text-slate-600">
                        <div>
                          {(() => {
                            const dataBase = r.data_lancamento || r.criado_em || r.dataHora;
                            if (!dataBase) return '';
                            if (/^\d{4}-\d{2}-\d{2}$/.test(dataBase)) {
                              const parts = dataBase.split('-');
                              return `${parts[2]}/${parts[1]}/${parts[0]}`;
                            }
                            try {
                              const d = new Date(dataBase);
                              if (isNaN(d.getTime())) return dataBase;
                              return d.toLocaleDateString('pt-BR');
                            } catch {
                              return dataBase;
                            }
                          })()}
                        </div>
                        {r.lancamento_retroativo && (
                          <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-widest text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                            Retroativo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-800">
                        {nomeAluno}
                        {matriculaAluno && <span className="block text-xs text-slate-500">{matriculaAluno}</span>}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {turmaNome}
                        <span className="block text-xs text-slate-500 capitalize">{turnoExibicao}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-indigo-600">{formatPoints(r.total_pontos)}</td>
                      <td className="px-6 py-4 text-right print:hidden">
                        <div className="flex justify-end space-x-2">
                          {/* Visualização de Recibo */}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setReciboVisualizarId(r.id);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-1.5 rounded-md cursor-pointer"
                            title="Visualizar / Imprimir"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Ação para Operador (Manhã ou Tarde): Solicitar cancelamento do turno correspondente */}
                          {(profile?.perfil === 'manha' || profile?.perfil === 'tarde') && 
                           r.status.toLowerCase() === 'ativo' && 
                           !temSolicitacaoPendente && 
                           (getTurnoNormalizado(r.aluno_turno || r.turno) === profile?.perfil) && (
                            <button 
                              className="text-rose-600 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 p-1.5 rounded-md cursor-pointer inline-flex items-center"
                              title="Solicitar cancelamento"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSolicitarClick(r);
                              }}
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}

                          {/* Ação para Admin */}
                          {profile?.perfil === 'admin' && r.status.toLowerCase() === 'ativo' && temSolicitacaoPendente && (
                            <button 
                              className="text-white hover:bg-amber-700 bg-amber-600 p-1.5 rounded-md cursor-pointer inline-flex items-center"
                              title="Analisar Solicitação Pendente"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAnalisarClick(request);
                              }}
                            >
                              <AlertCircle className="h-4 w-4 animate-pulse" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Novo Bloco Independente: Rodapé de Soma de Pontuação */}
        {!loading && recibosFiltrados.length > 0 && (
          <div className="flex justify-between items-center px-6 py-4 bg-slate-50 border-t border-slate-200 font-bold text-slate-800 print:!block print:w-full print:mt-8 print:border-t-2 print:border-black print:pt-4 print:break-inside-avoid print:bg-transparent print:text-black">
            <div className="text-left font-black uppercase tracking-wider text-xs text-slate-500 print:text-black print:font-bold">
              {temSelecaoAtiva ? (
                <>
                  <span className="text-indigo-700 font-black print:text-black block text-sm sm:text-xs">
                    Total Selecionado ({selectedActiveRecibos.length} recibos)
                  </span>
                  <span className="text-xs text-slate-500 print:text-black font-normal block print:mt-1">
                    De {formatPoints(totalAtivosFiltrados)} pts filtrados
                  </span>
                </>
              ) : (
                <>
                  <span className="print:text-black text-slate-500 block text-sm sm:text-xs">Soma de Pontuação (Apenas Ativos)</span>
                  <span className="text-xs text-slate-400 font-normal block print:hidden">Desconsidera recibos cancelados</span>
                </>
              )}
            </div>
            <div className="text-right text-indigo-700 font-black text-2xl print:text-black print:font-black">
              {formatPoints(somaTotalPontos)} <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest print:text-black">pts</span>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Alerta de Duplicidade */}
      {alertaDuplicidade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            onClick={() => setAlertaDuplicidade('')}
          />
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-150">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 text-amber-600 mb-4">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Solicitação já existente</h3>
            <p className="text-sm text-slate-500 mb-6">
              {alertaDuplicidade}
            </p>
            <button
              onClick={() => setAlertaDuplicidade('')}
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Compreendi
            </button>
          </div>
        </div>
      )}

      {/* Modal para Solicitar Cancelamento (Operadores) */}
      {modalSolicitarOpen && reciboParaSolicitar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            onClick={() => setModalSolicitarOpen(false)}
          />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col p-6">
            <div className="mb-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 text-amber-600 mb-4">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight text-center">Solicitar Cancelamento de Recibo</h3>
              <p className="text-sm text-slate-500 mt-2 text-center">
                Preencha o motivo para solicitar o cancelamento do Recibo <strong className="text-slate-800">#{reciboParaSolicitar.numero}</strong>. 
                Sua solicitação será analisada por um administrador.
              </p>
            </div>

            <div className="space-y-4 my-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Motivo da Solicitação (Mínimo de 10 caracteres) <span className="text-rose-500">*</span>
              </label>
              <textarea
                placeholder="Exemplo: Erro de digitação na quantidade de Amoebas recebidas."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm h-28 resize-none text-slate-800"
                value={motivoSolicitacao}
                onChange={(e) => {
                  setMotivoSolicitacao(e.target.value);
                  if (e.target.value.trim().length >= 10) setErroSolicitacao('');
                }}
              />
              {erroSolicitacao && (
                <p className="text-xs font-semibold text-rose-500 flex items-center gap-1 animate-pulse">
                  <AlertCircle className="h-3.5 w-3.5 inline text-rose-500" /> {erroSolicitacao}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                onClick={() => setModalSolicitarOpen(false)}
                className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={confirmarSolicitacao}
                className="px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md shadow-amber-100 active:scale-95 cursor-pointer"
              >
                Enviar Solicitação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Análise de Solicitação de Cancelamento (Admin) */}
      {modalAnaliseOpen && solicitacaoEmAnalise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            onClick={() => !isAnalysing && setModalAnaliseOpen(false)}
          />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col p-6">
            <div className="mb-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 text-indigo-600 mb-4">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight text-center">Analisar Solicitação de Cancelamento</h3>
              <div className="bg-slate-50 p-4 rounded-2xl mx-1.5 my-3 text-xs text-slate-600 space-y-2">
                <p><strong>Recibo:</strong> #{solicitacaoEmAnalise.numero_recibo}</p>
                <p><strong>Aluno:</strong> {solicitacaoEmAnalise.aluno_nome} ({solicitacaoEmAnalise.aluno_turma})</p>
                <p><strong>Solicitado por:</strong> {solicitacaoEmAnalise.solicitado_por_nome}</p>
                <p><strong>Data da solicitação:</strong> {new Date(solicitacaoEmAnalise.solicitado_em).toLocaleString('pt-BR')}</p>
                <p className="bg-white p-2 sm:p-3 rounded-lg border border-slate-100 italic break-words">
                  <strong>Motivo:</strong> "{solicitacaoEmAnalise.motivo}"
                </p>
              </div>
            </div>

            <div className="space-y-4 my-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Observação / Justificativa da Análise (Opcional)
              </label>
              <textarea
                disabled={isAnalysing}
                placeholder="Insira notas adicionais sobre a homologação aqui..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm h-20 resize-none text-slate-800 disabled:opacity-50"
                value={observacaoAnalise}
                onChange={(e) => setObservacaoAnalise(e.target.value)}
              />
              {erroAnalise && (
                <p className="text-xs font-semibold text-rose-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 inline" /> {erroAnalise}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 mt-4 pt-2 border-t border-slate-100">
              <button
                disabled={isAnalysing}
                onClick={() => setModalAnaliseOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Voltar
              </button>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isAnalysing}
                  onClick={() => confirmarAnalise('recusada')}
                  className="px-4 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" /> {isAnalysing ? 'Aguarde...' : 'Recusar'}
                </button>
                <button
                  type="button"
                  disabled={isAnalysing}
                  onClick={() => confirmarAnalise('aprovada')}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1 shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" /> {isAnalysing ? 'Processando...' : 'Aprovar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Auditoria de Cancelamento Direto do Admin */}
      {modalCancelamentoOpen && reciboParaCancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            onClick={() => !isCancelling && setModalCancelamentoOpen(false)}
          />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col p-6">
            <div className="mb-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-rose-100 text-rose-600 mb-4 animate-bounce">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight text-center">Audiência de Cancelamento de Recibo</h3>
              <p className="text-sm text-slate-500 mt-2 text-center">
                Você solicitou o cancelamento oficial do Recibo <strong className="text-rose-600">#{reciboParaCancelar.numero}</strong>. 
                Esta operação é irreversível, será registrada na fita de auditoria e removerá todos os pontos das turmas e alunos correspondentes.
              </p>
            </div>

            <div className="space-y-4 my-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Motivo do Cancelamento <span className="text-rose-500">*</span>
              </label>
              <textarea
                disabled={isCancelling}
                placeholder="Exemplo: Erro de digitação na quantidade de Amoebas recebidas."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none transition-all text-sm h-24 resize-none text-slate-800 disabled:opacity-50"
                value={motivoCancelamento}
                onChange={(e) => {
                  setMotivoCancelamento(e.target.value);
                  if (e.target.value.trim()) setErroCancelamento('');
                }}
              />
              {erroCancelamento && (
                <p className="text-xs font-semibold text-rose-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 inline" /> {erroCancelamento}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                disabled={isCancelling}
                onClick={() => setModalCancelamentoOpen(false)}
                className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Manter Ativo
              </button>
              <button
                disabled={isCancelling}
                onClick={confirmarCancelamento}
                className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md shadow-rose-100 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isCancelling ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal/Panel de Filtros */}
      {isFiltersOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            onClick={() => setIsFiltersOpen(false)}
          />
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">Filtrar Recibos</h3>
              </div>
              <button 
                onClick={() => setIsFiltersOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 py-4">
              {/* Turma */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Turma
                </label>
                <select
                  value={tempTurma}
                  onChange={(e) => setTempTurma(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Todas as Turmas</option>
                  {mockTurmas
                    .filter(t => {
                      if (profile?.perfil === 'manha' || profile?.perfil === 'tarde') {
                        return getTurnoNormalizado(t.turno) === userTurno;
                      }
                      return true;
                    })
                    .map(t => (
                      <option key={t.id} value={t.nome}>
                        {t.nome} ({t.turno === 'manha' ? 'Manhã' : 'Tarde'})
                      </option>
                    ))}
                </select>
              </div>

              {/* Turno (Apenas para admin ou consulta) */}
              {(profile?.perfil === 'admin' || profile?.perfil === 'consulta') && (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Turno
                  </label>
                  <select
                    value={tempTurno}
                    onChange={(e) => setTempTurno(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Todos os Turnos</option>
                    <option value="manha">Manhã</option>
                    <option value="tarde">Tarde</option>
                  </select>
                </div>
              )}

              {/* Status */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Status
                </label>
                <select
                  value={tempStatus}
                  onChange={(e) => setTempStatus(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="todos">Todos</option>
                  <option value="ativo">Ativos</option>
                  <option value="cancelado">Cancelados</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Limpar Filtros
              </button>
              <button
                type="button"
                onClick={() => handleApplyFilters(tempTurma, tempTurno, tempStatus)}
                disabled={isApplying}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isApplying && <Loader2 className="h-3 w-3 animate-spin" />}
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização Detalhada do Recibo */}
      {reciboVisualizarId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            onClick={() => setReciboVisualizarId(null)}
          />
          <div className="relative bg-white w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl overflow-y-auto animate-in zoom-in-95 duration-200 flex flex-col p-6 sm:p-8">
            <button 
              onClick={() => setReciboVisualizarId(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-50 transition-colors z-10 cursor-pointer"
              title="Fechar"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="mt-4">
              <ReciboView reciboId={reciboVisualizarId} onClose={() => setReciboVisualizarId(null)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
