import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
import { Search, Eye, Ban, Filter, AlertCircle, Shield, Check, X, Loader2 } from 'lucide-react';

export function ConsultaRecibos() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [busca, setBusca] = useState('');
  const [recibosList, setRecibosList] = useState<Recibo[]>([]);
  const [solicitacoesList, setSolicitacoesList] = useState<SolicitacaoCancelamento[]>(mockSolicitacoes);
  const [loading, setLoading] = useState(true);
  const [errorFetch, setErrorFetch] = useState<string | null>(null);

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

  // Estados para Auditoria de Cancelamento Direto do Admin
  const [modalCancelamentoOpen, setModalCancelamentoOpen] = useState(false);
  const [reciboParaCancelar, setReciboParaCancelar] = useState<{ id: string, numero: string } | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [erroCancelamento, setErroCancelamento] = useState('');

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

  // Handler para cancelar diretamente (admin)
  const handleCancelarClick = (id: string, numero: string) => {
    setReciboParaCancelar({ id, numero });
    setMotivoCancelamento('');
    setErroCancelamento('');
    setModalCancelamentoOpen(true);
  };

  const confirmarCancelamento = () => {
    if (!motivoCancelamento.trim()) {
      setErroCancelamento('O motivo do cancelamento é obrigatório.');
      return;
    }
    if (reciboParaCancelar && profile) {
      const canceladoPor = `${profile.nome} (Administrador)`;
      cancelMockRecibo(reciboParaCancelar.id, canceladoPor, motivoCancelamento.trim());
      setRecibosList([...mockRecibos]);
      setModalCancelamentoOpen(false);
      setReciboParaCancelar(null);
      setMotivoCancelamento('');
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

    const ok = await processarAnaliseSolicitacao(
      solicitacaoEmAnalise.id,
      novoStatus,
      profile.id,
      profile.nome,
      observacaoAnalise.trim()
    );

    if (ok) {
      setRecibosList([...mockRecibos]);
      setSolicitacoesList([...mockSolicitacoes]);
      setModalAnaliseOpen(false);
      setSolicitacaoEmAnalise(null);
      setObservacaoAnalise('');
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

  // Filtragem de Recibos de acordo com regras de turno e permissões
  const baseRecibos = profile?.perfil === 'admin' || profile?.perfil === 'consulta'
    ? recibosList 
    : recibosList.filter(r => {
        const turnoRec = getTurnoNormalizado(r.aluno_turno || r.turno);
        return turnoRec === userTurno;
      });

  const recibosFiltrados = baseRecibos.filter(r => {
    if (!busca) return true;
    const searchLower = busca.toLowerCase();
    const aluno = mockAlunos.find(a => a.id === r.alunoId);
    const nomeAluno = (r.aluno_nome || aluno?.nome || '').toLowerCase();
    const matriculaAluno = r.aluno_matricula || aluno?.matricula || '';
    
    return (
      String(r.numero ?? r.numero_recibo ?? '').toLowerCase().includes(searchLower) ||
      nomeAluno.includes(searchLower) ||
      matriculaAluno.includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Consulta de Recibos</h1>
      </div>

      {/* PAINEL ADMIN: Solicitações de Cancelamento Pendentes */}
      {profile?.perfil === 'admin' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
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
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row gap-4">
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
          <button className="flex items-center justify-center px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer w-full sm:w-auto">
            <Filter className="h-4 w-4 mr-2" /> Filtros
          </button>
        </div>
      </div>

      {errorFetch && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl font-bold text-sm">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <span>{errorFetch}</span>
        </div>
      )}

      {/* Listagem Geral de Recibos */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-700 font-medium">
              <tr>
                <th className="px-6 py-4 border-b border-slate-200">Status</th>
                <th className="px-6 py-4 border-b border-slate-200">Nº Recibo</th>
                <th className="px-6 py-4 border-b border-slate-200">Data</th>
                <th className="px-6 py-4 border-b border-slate-200">Aluno</th>
                <th className="px-6 py-4 border-b border-slate-200">Turma/Turno</th>
                <th className="px-6 py-4 border-b border-slate-200 text-right">Pts</th>
                <th className="px-6 py-4 border-b border-slate-200 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                      <span>Carregando recibos...</span>
                    </div>
                  </td>
                </tr>
              ) : recibosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
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
                    <tr key={r.id} className="hover:bg-slate-50">
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
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2">
                          {/* Visualização de Recibo */}
                          <button 
                            onClick={() => navigate(`/recibo/${r.id}`)}
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
                              onClick={() => handleSolicitarClick(r)}
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}

                          {/* Ação para Admin */}
                          {profile?.perfil === 'admin' && r.status.toLowerCase() === 'ativo' && temSolicitacaoPendente && (
                            <button 
                              className="text-white hover:bg-amber-700 bg-amber-600 p-1.5 rounded-md cursor-pointer inline-flex items-center"
                              title="Analisar Solicitação Pendente"
                              onClick={() => handleAnalisarClick(request)}
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
            onClick={() => setModalAnaliseOpen(false)}
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
                placeholder="Insira notas adicionais sobre a homologação aqui..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm h-20 resize-none text-slate-800"
                value={observacaoAnalise}
                onChange={(e) => setObservacaoAnalise(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between gap-3 mt-4 pt-2 border-t border-slate-100">
              <button
                onClick={() => setModalAnaliseOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Voltar
              </button>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => confirmarAnalise('recusada')}
                  className="px-4 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1"
                >
                  <X className="h-3.5 w-3.5" /> Recusar
                </button>
                <button
                  type="button"
                  onClick={() => confirmarAnalise('aprovada')}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1 shadow-sm active:scale-95"
                >
                  <Check className="h-3.5 w-3.5" /> Aprovar
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
            onClick={() => setModalCancelamentoOpen(false)}
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
                placeholder="Exemplo: Erro de digitação na quantidade de Amoebas recebidas."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none transition-all text-sm h-24 resize-none text-slate-800"
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
                onClick={() => setModalCancelamentoOpen(false)}
                className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Manter Ativo
              </button>
              <button
                onClick={confirmarCancelamento}
                className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md shadow-rose-100 active:scale-95 cursor-pointer"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
