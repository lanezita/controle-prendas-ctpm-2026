import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { mockPrendas, isCampanhaVigente, getLocalDataFmt, fetchRecibosFromDB } from '../lib/mock-data'; // Usando apenas para nomes de prendas enquanto os ativos não são carregados na dashboard
import { formatPoints, cn } from '../lib/utils';
import { Trophy, FileText, Zap, TrendingUp, Clock, Loader2, AlertCircle, Printer, Eye } from 'lucide-react';
import { PrintSelectionModal } from '../components/PrintSelectionModal';
import { Logo } from '../components/Logo';
import { SCHOOL_NAME, SYSTEM_NAME } from '../constants';


function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}


export function Dashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [campanhasAtivas, setCampanhasAtivas] = useState<any[]>([]);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedPrintItems, setSelectedPrintItems] = useState<string[]>([]);
  
  // Real database connection state
  const [recibosList, setRecibosList] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filtroTurno, setFiltroTurno] = useState<string>('todos');

  // Normalization helper
  const getTurnoNormalizadoLocal = (t: string | undefined | null): string => {
    if (!t) return '';
    const lower = t.toLowerCase().trim();
    if (lower === 'manhã' || lower === 'manha' || lower === 'matutino') return 'manha';
    if (lower === 'tarde' || lower === 'vespertino') return 'tarde';
    return lower;
  };

  // Configure initialized shift filter securely based on profile/turno
  useEffect(() => {
    if (profile) {
      if (profile.perfil === 'admin') {
        setFiltroTurno('todos');
      } else if (profile.perfil === 'consulta') {
        if (profile.turno === 'ambos' || !profile.turno) {
          setFiltroTurno('todos');
        } else {
          setFiltroTurno(profile.turno);
        }
      } else if (profile.perfil === 'manha') {
        setFiltroTurno('manha');
      } else if (profile.perfil === 'tarde') {
        setFiltroTurno('tarde');
      } else {
        const norm = getTurnoNormalizadoLocal(profile.turno || profile.perfil);
        setFiltroTurno(norm === 'tarde' ? 'tarde' : 'manha');
      }
    }
  }, [profile]);

  // Compute all indicators reactively
  const stats = useMemo(() => {
    const baseRecibos = recibosList.filter(r => {
      if (filtroTurno === 'todos') return true;
      const tNorm = getTurnoNormalizadoLocal(r.aluno_turno || r.turno);
      return tNorm === filtroTurno;
    });

    // Rule 2: Pontos totais: sum(total_pontos) somente de recibos com status = 'ativo'
    const total_pontos = baseRecibos
      .filter(r => r.status === 'ativo')
      .reduce((acc, r) => acc + (Number(r.total_pontos) || 0), 0);

    // Rule 3: Recibos emitidos: count(*) somente de recibos com status = 'ativo'
    const total_recibos = baseRecibos.filter(r => r.status === 'ativo').length;

    // Rule 7: Líder do turno: agrupar por codigo_turma (aluno_turma)
    const classPoints: Record<string, { pontos: number; turno: string }> = {};
    baseRecibos
      .filter(r => r.status === 'ativo')
      .forEach(r => {
        const classCode = r.aluno_turma || r.turmaId;
        if (classCode) {
          const tNorm = getTurnoNormalizadoLocal(r.aluno_turno || r.turno);
          if (!classPoints[classCode]) {
            classPoints[classCode] = { pontos: 0, turno: tNorm };
          }
          classPoints[classCode].pontos += (Number(r.total_pontos) || 0);
        }
      });

    const highlights = Object.entries(classPoints).map(([codigo, val]) => ({
      codigo,
      pontos: val.pontos,
      turno: val.turno
    }));

    highlights.sort((a, b) => b.pontos - a.pontos);
    const topClass = highlights[0];
    const turmaDestaque = topClass
      ? { nome: topClass.codigo, turno: topClass.turno }
      : { nome: '', turno: '' };

    // Rule 6: Atividade recente (ativos e cancelados, mas respeitando o shift filter)
    const atividadeRecente = baseRecibos.slice(0, 10);

    return {
      total_pontos,
      total_recibos,
      turmaDestaque,
      atividadeRecente
    };
  }, [recibosList, filtroTurno]);

  const handlePrintAction = (items: string[], action: 'VIEW' | 'PRINT') => {
    setSelectedPrintItems(items);
    setIsPrintModalOpen(false);
    
    if (action === 'VIEW') {
      setIsPreviewOpen(true);
    } else {
      setIsPreviewOpen(true);
      setTimeout(() => {
        window.print();
      }, 300);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchDashboardStats();
      fetchCampanhas();
    }
  }, [profile]);

  const fetchDashboardStats = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (!profile) return;
      // Fetch latest receipts from DB
      const dbRecibos = await fetchRecibosFromDB();
      setRecibosList(dbRecibos || []);
    } catch (err: any) {
      console.error('Erro ao carregar stats do Supabase:', err);
      setErrorMsg('Ocorreu uma falha ao obter os dados atualizados do Supabase. Exibindo informações em cache local.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCampanhas = async () => {
    try {
      let query = supabase.from('campanhas_relampago').select('*').eq('status', 'ativa');
      
      if (profile?.perfil !== 'admin' && profile?.turno !== 'ambos') {
        const t = profile?.turno;
        query = query.or(`turno_aplicacao.eq.ambos,turno_aplicacao.eq.${t}`);
      }

      const { data } = await query;
      const activeOnly = (data || []).filter(c => isCampanhaVigente(c));
      setCampanhasAtivas(activeOnly);
    } catch (err) {
      console.warn('Tabela de campanhas ainda não integrada ou vazia:', err);
      setCampanhasAtivas([]);
    }
  };

  const today = new Date().toLocaleDateString('pt-BR');
  const userTurno = (profile?.perfil === 'admin' || profile?.turno === 'ambos') 
    ? 'Ambos' 
    : (profile?.turno === 'manha' ? 'Manhã' : 'Tarde');

  useEffect(() => {
    if (isPreviewOpen) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isPreviewOpen]);

  return (
    <div className="space-y-6 relative min-h-screen">
      <PrintSelectionModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        reportType="RELATORIO"
        onAction={handlePrintAction}
      />

      {/* Área de Visualização/Impressão */}
      {isPreviewOpen && (
        <div className="bg-white p-4 sm:p-8 text-black shadow-2xl rounded-2xl sm:rounded-[2rem] border-2 sm:border-4 border-indigo-500 mb-8 animate-in fade-in slide-in-from-top-4 duration-500 w-full max-w-full overflow-hidden box-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-100 no-print">
            <div className="flex items-center gap-2 text-indigo-600">
              <Eye className="w-6 h-6 shrink-0" />
              <span className="font-black text-xs sm:text-sm uppercase tracking-widest">Modo de Visualização (Relatório)</span>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="px-3 py-2 font-black text-[9px] sm:text-[10px] text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors cursor-pointer"
              >
                Sair
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center px-4 sm:px-6 py-2 bg-indigo-600 text-white rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 active:scale-95 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5 sm:mr-2" />
                Imprimir Documento
              </button>
            </div>
          </div>
          
          {/* Document Content */}
          <div id="print-area" className="print-area w-full max-w-full sm:max-w-4xl mx-auto border border-slate-100 p-4 sm:p-8 shadow-sm overflow-x-auto box-border bg-white text-slate-900">
            <header className="flex flex-col items-center mb-10 border-b-2 border-slate-900 pb-6 text-center">
              <Logo fallbackSize="lg" className="h-16 w-auto mb-4" />
              <h1 className="text-xl font-black uppercase tracking-tight">{SCHOOL_NAME}</h1>
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">{SYSTEM_NAME}</h2>
              <div className="mt-6 flex flex-wrap justify-center gap-6 text-[10px] font-bold uppercase tracking-tighter text-slate-400">
                <span>Data de Emissão: {today}</span>
                <span>Filtro de Turno: {userTurno}</span>
                <span>Responsável: {profile?.nome}</span>
              </div>
            </header>

            <h3 className="text-2xl font-black text-center uppercase tracking-tighter bg-slate-900 text-white py-3 mb-10">Relatório de Arrecadação Diário</h3>

            <div className="space-y-12">
              {selectedPrintItems.includes('resumo_geral') && (
                <section>
                  <h4 className="text-[10px] font-black uppercase tracking-widest mb-4 border-l-4 border-slate-900 pl-2">Indicadores Principais</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-6 print:gap-4">
                    <div className="border-2 border-slate-900 p-6 rounded-2xl">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Pontuação Total</p>
                      <p className="text-3xl font-black">{formatPoints(stats.total_pontos)}</p>
                    </div>
                    <div className="border-2 border-slate-900 p-6 rounded-2xl">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Turma em Destaque</p>
                      <p className="text-xl font-black uppercase">{stats.turmaDestaque.nome || 'Nenhuma'}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{stats.turmaDestaque.turno === 'manha' ? 'Matutino' : (stats.turmaDestaque.turno === 'tarde' ? 'Vespertino' : '')}</p>
                    </div>
                    <div className="border-2 border-slate-900 p-6 rounded-2xl">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Status do Dia</p>
                        <p className="text-xs font-bold uppercase">{stats.total_pontos > 0 ? 'Movimentação Ativa' : 'Sem Movimentação'}</p>
                    </div>
                  </div>
                </section>
              )}

              {selectedPrintItems.includes('campanhas_aplicadas') && campanhasAtivas.length > 0 && (
                <section>
                  <h4 className="text-[10px] font-black uppercase tracking-widest mb-4 border-l-4 border-slate-900 pl-2">Campanhas Relâmpago Ativas</h4>
                  
                  {/* Desktop Table View */}
                  <div className="hidden md:block border-2 border-slate-900 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white">
                          <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest">Nome da Campanha</th>
                          <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest">Multiplicador</th>
                          <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest">Público Turno</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {campanhasAtivas.map(c => (
                          <tr key={c.id}>
                            <td className="px-6 py-4 text-xs font-bold uppercase whitespace-normal break-words">{c.nome_campanha || c.nome}</td>
                            <td className="px-6 py-4 text-xs font-black text-indigo-600 whitespace-nowrap">{c.multiplicador}x Pontos</td>
                            <td className="px-6 py-4 text-xs uppercase text-slate-500 font-bold whitespace-nowrap">
                              {c.turno_aplicacao === 'ambos' ? 'Geral' : (c.turno_aplicacao === 'manha' ? 'Matutino' : 'Vespertino')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="md:hidden space-y-4">
                    {campanhasAtivas.map(c => (
                      <div key={c.id} className="border-2 border-slate-900 rounded-xl p-4 bg-white shadow-sm flex flex-col gap-2.5">
                        <div className="flex justify-between items-start gap-2">
                          <h5 className="font-extrabold text-sm text-slate-900 uppercase tracking-tight break-words whitespace-normal min-w-0 flex-1 leading-normal">
                            {c.nome_campanha || c.nome}
                          </h5>
                          <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 tracking-wider">
                            Ativa
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-[11px]">
                          <div>
                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Multiplicador</span>
                            <span className="font-black text-indigo-600 uppercase">{c.multiplicador}x Pontos</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Turno</span>
                            <span className="font-bold text-slate-700 uppercase">
                              {c.turno_aplicacao === 'ambos' ? 'Todos os Turnos' : (c.turno_aplicacao === 'manha' ? 'Manhã' : 'Tarde')}
                            </span>
                          </div>
                          {(c.data_inicio || c.dataInicial) && (
                            <div className="col-span-2">
                              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Período</span>
                              <span className="font-semibold text-slate-600">
                                {formatDate(c.data_inicio || c.dataInicial)} { (c.data_fim || c.dataFinal) && `até ${formatDate(c.data_fim || c.dataFinal)}` }
                              </span>
                            </div>
                          )}
                          {c.observacao && (
                            <div className="col-span-2">
                              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Observação</span>
                              <p className="font-medium text-slate-500 break-words leading-relaxed whitespace-normal">{c.observacao}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Placeholder para seções detalhadas */}
              {(selectedPrintItems.includes('lista_recibos') || selectedPrintItems.includes('lista_alunos') || selectedPrintItems.includes('lista_prendas')) && (
                 <section className="bg-slate-50 p-10 text-center rounded-[2rem] border-2 border-dashed border-slate-200">
                    <AlertCircle className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                    <h5 className="font-black text-slate-400 uppercase tracking-widest text-xs">Dados Detalhados Pendentes</h5>
                    <p className="text-[10px] text-slate-400 uppercase mt-2 max-w-sm mx-auto font-bold tracking-tight">Os relatórios analíticos de lançamentos individuais estarão disponíveis após a conclusão da etapa de migração de persistência do BD.</p>
                 </section>
              )}
            </div>

            <footer className="mt-20 pt-10 border-t-2 border-slate-900 flex flex-col sm:flex-row justify-between items-center sm:items-end gap-6 sm:gap-4 text-center sm:text-left">
               <div className="flex flex-col items-center sm:items-start gap-2">
                  <div className="w-56 h-0.5 bg-slate-900"></div>
                  <p className="text-[10px] font-black uppercase">Responsável pelo Lançamento</p>
                  <p className="text-[9px] text-slate-500 font-medium">{profile?.nome} &mdash; Matrícula: {profile?.id.split('-')[0]}</p>
               </div>
               <div className="text-center sm:text-right">
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-loose">Autenticação: {new Date().getTime().toString(36).toUpperCase()}</p>
                  <p className="text-[10px] text-slate-900 font-black uppercase">{SCHOOL_NAME}</p>
               </div>
            </footer>
          </div>
        </div>
      )}

      {/* Hidden view dedicated for real printing (exactly what goes to printer) */}
      <div className="hidden">
          {/* Header */}
          <div className="flex flex-col items-center mb-8 border-b-2 border-black pb-4 text-center">
            <Logo fallbackSize="md" className="h-18 w-auto mb-2" />
            <h1 className="text-lg font-black uppercase tracking-tight">{SCHOOL_NAME}</h1>
            <p className="text-xs font-bold uppercase tracking-widest">{SYSTEM_NAME}</p>
            <div className="mt-4 flex gap-4 text-[9px] font-bold uppercase">
              <span>Data: {today}</span>
              <span>Emissor: {profile?.nome}</span>
            </div>
          </div>

          <h2 className="text-lg font-black text-center uppercase tracking-tighter border-2 border-black py-1 mb-6">Relatório Oficial de Arrecadação</h2>

          <div className="space-y-8">
            {selectedPrintItems.includes('resumo_geral') && (
               <div className="grid grid-cols-2 gap-4">
                  <div className="border border-black p-3">
                    <p className="text-[8px] font-bold uppercase mb-1">Pontuação Total</p>
                    <p className="text-xl font-black">{formatPoints(stats.total_pontos)}</p>
                  </div>
                  <div className="border border-black p-3">
                    <p className="text-[8px] font-bold uppercase mb-1">Referência</p>
                    <p className="text-xs font-black uppercase">{stats.turmaDestaque.nome || '--'}</p>
                  </div>
               </div>
            )}

            {selectedPrintItems.includes('campanhas_aplicadas') && campanhasAtivas.length > 0 && (
               <div className="border border-black">
                 <div className="bg-black text-white px-2 py-1 text-[8px] font-black uppercase tracking-widest">Campanhas Relâmpago Ativas</div>
                 <table className="w-full text-left text-[9px]">
                   <thead className="border-b border-black">
                     <tr>
                       <th className="px-2 py-1 font-bold uppercase">Campanha</th>
                       <th className="px-2 py-1 font-bold uppercase">Mult.</th>
                       <th className="px-2 py-1 font-bold uppercase">Turno</th>
                     </tr>
                   </thead>
                   <tbody>
                     {campanhasAtivas.map(c => (
                       <tr key={c.id} className="border-b border-slate-100">
                         <td className="px-2 py-1 uppercase">{c.nome}</td>
                         <td className="px-2 py-1 font-bold">{c.multiplicador}x</td>
                         <td className="px-2 py-1 uppercase">{c.turno_aplicacao}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            )}
          </div>

          <div className="mt-16 pt-8 border-t border-black flex justify-between items-end">
             <div className="flex flex-col gap-1">
                <div className="w-40 h-[1px] bg-black"></div>
                <p className="text-[8px] font-bold uppercase">Assinatura Responsável</p>
             </div>
             <p className="text-[7px] text-slate-500 italic uppercase">Página 1 de 1 &mdash; Gerado Eletronicamente</p>
          </div>
      </div>

      <div className={cn("space-y-6 no-print", isPreviewOpen && "opacity-40 grayscale pointer-events-none")}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Painel Inicial</h1>
            <p className="text-slate-500 text-xs md:text-sm">Controle de arrecadação de prendas &mdash; Estilo CTPM.</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
            {errorMsg && (
              <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-800 font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg shrink-0">
                ⚠️ Erro de Rede
              </span>
            )}
            
            {/* Shift selector for administrators or all-shift consult profiles */}
            {(profile?.perfil === 'admin' || (profile?.perfil === 'consulta' && (profile?.turno === 'ambos' || !profile?.turno))) ? (
              <div className="flex items-center gap-2">
                <label htmlFor="dashboard-select-turno" className="text-[10px] font-black uppercase text-slate-400 tracking-widest whitespace-nowrap">Turno:</label>
                <select
                  id="dashboard-select-turno"
                  value={filtroTurno}
                  onChange={(e) => setFiltroTurno(e.target.value)}
                  className="px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-350 text-slate-800 rounded-xl font-black text-xs uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-xs cursor-pointer"
                >
                  <option value="todos">Geral (Ambos)</option>
                  <option value="manha">Manhã</option>
                  <option value="tarde">Tarde</option>
                </select>
              </div>
            ) : (
              // Badge displaying restricted shift
              <span className="inline-flex items-center px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-50 border border-slate-150 text-slate-600">
                Turno: {filtroTurno === 'manha' ? 'Matutino' : 'Vespertino'}
              </span>
            )}

            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-slate-950 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-100 active:scale-95 cursor-pointer w-full sm:w-auto"
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir relatório do dia
            </button>
            {loading && <Loader2 className="w-5 h-5 animate-spin text-indigo-600 shrink-0 mx-auto sm:mx-0" />}
          </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
            <TrendingUp className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pontos Totais</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{formatPoints(stats.total_pontos)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 relative overflow-hidden">
          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
            <FileText className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recibos Emitidos</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{stats.total_recibos}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
            <Zap className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Campanhas</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{campanhasAtivas.length}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-rose-50 p-3 rounded-xl border border-rose-100">
            <Trophy className="h-6 w-6 text-rose-600" />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">
              {profile?.perfil === 'admin' || profile?.turno === 'ambos' ? 'Líder Geral' : 'Líder do Turno'}
            </p>
            {stats.turmaDestaque.nome ? (
              <h3 className="text-lg font-black text-indigo-700 truncate uppercase tracking-tighter">Turma {stats.turmaDestaque.nome}</h3>
            ) : (
              <p className="text-sm text-slate-400 italic">Sem registros</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <h2 className="font-bold text-slate-800 text-xs uppercase tracking-widest">Campanhas em Vigor</h2>
            </div>
          </div>
          <div className="p-0 min-h-[150px] flex flex-col justify-center">
            {campanhasAtivas.length === 0 ? (
              <div className="p-10 text-center">
                 <p className="text-slate-400 font-medium italic text-sm font-sans">Nenhuma campanha relâmpago cadastrada no momento.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {campanhasAtivas.map(c => {
                  const prenda = mockPrendas.find(p => p.id === c.prenda_id);
                  return (
                    <li key={c.id} className="p-5 hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-center bg-white">
                        <div className="flex-1">
                          <p className="font-black text-slate-900 uppercase text-xs tracking-tight">{c.nome_campanha || c.nome}</p>
                          <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-widest opacity-60">Item: {prenda?.nome || 'Diversos'} • {c.turno_aplicacao === 'ambos' ? 'Todos os Turnos' : (c.turno_aplicacao === 'manha' ? 'Manhã' : 'Tarde')}</p>
                        </div>
                        <div className="bg-amber-100 text-amber-800 px-2 py-1 rounded font-black text-xs tracking-tighter shadow-sm border border-amber-200">
                          {c.multiplicador}X PONTOS
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden text-slate-900 flex flex-col justify-between">
          <div className="p-5 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-500" />
              <h2 className="font-bold text-slate-800 text-xs uppercase tracking-widest">Atividade Recente</h2>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 rounded border border-emerald-100 shrink-0">
               <span className="relative flex h-1.5 w-1.5">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-600"></span>
               </span>
               <span className="text-[8px] font-black text-emerald-700 uppercase tracking-wider">Tempo Real</span>
            </div>
          </div>
          <div className="p-0 min-h-[150px] flex flex-col justify-start">
            {stats.atividadeRecente.length === 0 ? (
              <div className="p-10 text-center flex-1 flex items-center justify-center">
                <p className="text-slate-400 font-medium italic text-sm font-sans">
                  Nenhum recibo emitido no turno selecionado.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {stats.atividadeRecente.map((rec) => (
                  <li key={rec.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center text-xs md:text-sm">
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className={cn("font-bold text-slate-800 uppercase truncate max-w-[200px]", rec.status === 'cancelado' && "line-through text-slate-400")}>
                          {rec.aluno_nome || `Matrícula: ${rec.aluno_matricula || '---'}`}
                        </span>
                        {rec.status === 'cancelado' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-rose-100 text-rose-800 shrink-0">
                            Cancelado
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 uppercase font-bold tracking-widest opacity-80 truncate">
                        Classe: {rec.aluno_turma || rec.turmaId || 'S/T'} • Turno: {getTurnoNormalizadoLocal(rec.aluno_turno || rec.turno) === 'manha' ? 'Matutino' : 'Vespertino'} • Recibo: {rec.numero}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={cn("font-black text-indigo-700 text-sm", rec.status === 'cancelado' && "line-through text-rose-400/70")}>
                        {formatPoints(rec.total_pontos)} pts
                      </span>
                      <p className="text-[9px] text-slate-400 font-semibold mt-0.5 leading-none">
                        {(() => {
                          const dataBase = rec.data_lancamento || rec.criado_em || rec.dataHora;
                          if (!dataBase) return '';
                          if (/^\d{4}-\d{2}-\d{2}$/.test(dataBase)) {
                            const parts = dataBase.split('-');
                            return `${parts[2]}/${parts[1]}/${parts[0]}`;
                          }
                          try {
                            const d = new Date(dataBase);
                            if (isNaN(d.getTime())) return dataBase;
                            // check if there is a time component
                            if (dataBase.includes('T') || dataBase.includes(':')) {
                              return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                            } else {
                              return d.toLocaleDateString('pt-BR');
                            }
                          } catch {
                            return dataBase;
                          }
                        })()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
