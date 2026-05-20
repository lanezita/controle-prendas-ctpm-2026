import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { formatPoints, cn } from '../lib/utils';
import { getRankingAlunos, getRankingTurmas, getRankingTurnos } from '../lib/mock-data';
import { Trophy, Medal, Award, Users, Sun, Moon, Globe, Loader2, Printer, Eye } from 'lucide-react';
import { PrintSelectionModal } from '../components/PrintSelectionModal';
import { Logo } from '../components/Logo';
import { SCHOOL_NAME, SYSTEM_NAME } from '../constants';


interface RankingAluno {
  aluno_id: string;
  nome_completo: string;
  codigo_turma: string;
  turno: string;
  total_pontos: number;
}

interface RankingTurma {
  codigo_turma: string;
  turno: string;
  total_pontos: number;
}

interface RankingTurno {
  turno: string;
  total_pontos: number;
}

export function Ranking() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<'ALUNO' | 'TURMA'>('TURMA');
  const [loading, setLoading] = useState(true);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedPrintItems, setSelectedPrintItems] = useState<string[]>([]);
  
  const [turnoVisivel, setTurnoVisivel] = useState<'geral' | 'manha' | 'tarde'>(
    (profile?.perfil === 'admin' || (profile?.perfil === 'consulta' && profile?.turno === 'ambos')) 
      ? 'manha' 
      : (profile?.turno || 'manha') as 'manha' | 'tarde'
  );

  const [rankingAlunos, setRankingAlunos] = useState<RankingAluno[]>([]);
  const [rankingTurmas, setRankingTurmas] = useState<RankingTurma[]>([]);
  const [rankingTurnos, setRankingTurnos] = useState<RankingTurno[]>([]);

  const handlePrintAction = (items: string[], action: 'VIEW' | 'PRINT') => {
    setSelectedPrintItems(items);
    setIsPrintModalOpen(false);
    
    if (action === 'VIEW') {
      setIsPreviewOpen(true);
    } else {
      setIsPreviewOpen(false);
      setTimeout(() => {
        window.print();
      }, 300);
    }
  };

  useEffect(() => {
    // Se o usuário não for admin nem consulta com 'ambos', forçar o turno dele
    const isFreeQuery = profile?.perfil === 'admin' || (profile?.perfil === 'consulta' && profile?.turno === 'ambos');
    if (profile && !isFreeQuery && profile.turno && profile.turno !== 'ambos') {
      if (turnoVisivel !== profile.turno) {
        setTurnoVisivel(profile.turno as 'manha' | 'tarde');
      }
    }
    fetchRanking();
  }, [turnoVisivel, profile]);

  const fetchRanking = async () => {
    if (!profile) return;
    setLoading(true);

    try {
      const isFreeQuery = profile.perfil === 'admin' || (profile.perfil === 'consulta' && profile.turno === 'ambos');
      const queryTurno = isFreeQuery ? turnoVisivel : profile.turno;

      // Local Alunos ranking calculation
      const localAlunos = getRankingAlunos(queryTurno);
      setRankingAlunos(localAlunos);

      // Local Turmas ranking calculation
      const localTurmas = getRankingTurmas(queryTurno);
      setRankingTurmas(localTurmas);

      // Local Turnos ranking calculation
      const localTurnos = getRankingTurnos();
      setRankingTurnos(localTurnos);

    } catch (err) {
      console.error('Erro ao buscar rankings:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPositionIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (index === 1) return <Medal className="h-6 w-6 text-slate-400" />;
    if (index === 2) return <Award className="h-6 w-6 text-amber-700" />;
    return <span className="font-bold text-slate-500 w-6 text-center">{index + 1}º</span>;
  };

  const getPositionStyle = (index: number) => {
    if (index === 0) return "bg-yellow-50 border-yellow-200";
    if (index === 1) return "bg-slate-50 border-slate-200";
    if (index === 2) return "bg-orange-50 border-orange-200";
    return "bg-white border-slate-100 hover:bg-slate-50";
  };

  const today = new Date().toLocaleDateString('pt-BR');
  const isFreeQuery = profile?.perfil === 'admin' || (profile?.perfil === 'consulta' && profile?.turno === 'ambos');
  const userTurno = isFreeQuery ? turnoVisivel : profile?.turno;
  const turnoLabel = userTurno === 'manha' ? 'Manhã' : (userTurno === 'tarde' ? 'Tarde' : 'Geral');

  useEffect(() => {
    if (isPreviewOpen) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isPreviewOpen]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 relative min-h-screen">
      <PrintSelectionModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        reportType="RANKING"
        onAction={handlePrintAction}
      />

      {/* Área de Visualização/Impressão do Ranking */}
      {isPreviewOpen && (
        <div className="bg-white p-4 sm:p-8 text-black shadow-2xl rounded-2xl sm:rounded-[2rem] border-2 sm:border-4 border-indigo-500 mb-8 animate-in fade-in slide-in-from-top-4 duration-500 no-print w-full max-w-full overflow-hidden box-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 text-indigo-600">
              <Eye className="w-6 h-6 shrink-0" />
              <span className="font-black text-xs sm:text-sm uppercase tracking-widest">Modo de Visualização (Ranking)</span>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="px-3 py-2 font-black text-[9px] sm:text-[10px] text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
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
          
          <div className="w-full max-w-full sm:max-w-4xl mx-auto border border-slate-100 p-4 sm:p-8 shadow-sm overflow-x-auto box-border">
            <header className="flex flex-col items-center mb-10 border-b-2 border-slate-900 pb-6 text-center">
              <Logo fallbackSize="lg" className="h-16 w-auto mb-4" />
              <h1 className="text-xl font-black uppercase tracking-tight">{SCHOOL_NAME}</h1>
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">{SYSTEM_NAME}</h2>
              <div className="mt-6 flex flex-wrap justify-center gap-6 text-[10px] font-bold uppercase tracking-tighter text-slate-400">
                <span>Data: {today}</span>
                <span>Filtro Turno: {turnoLabel}</span>
                <span>Gerado por: {profile?.nome}</span>
              </div>
            </header>

            <h3 className="text-2xl font-black text-center uppercase tracking-tighter bg-slate-900 text-white py-3 mb-10">Ranking Oficial de Arrecadação 2026</h3>

            <div className="space-y-12">
              {selectedPrintItems.includes('destaques') && rankingTurmas.length > 0 && (
                <section>
                  <h4 className="text-[10px] font-black uppercase tracking-widest mb-6 border-l-4 border-slate-900 pl-2">Pódio de Turmas</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                    {rankingTurmas.slice(0, 3).map((t, i) => (
                      <div key={t.codigo_turma} className={`border-2 p-4 sm:p-6 rounded-2xl flex flex-col items-center justify-center ${i === 0 ? 'border-yellow-400 bg-yellow-50' : 'border-slate-200'}`}>
                        <span className="text-3xl mb-2">{i === 0 ? '🥇' : (i === 1 ? '🥈' : '🥉')}</span>
                        <p className="text-xs font-black uppercase text-slate-400 mb-1">{i + 1}º Lugar</p>
                        <p className="text-lg font-black uppercase text-slate-900">{t.codigo_turma}</p>
                        <p className="text-xl font-black text-indigo-600">{formatPoints(t.total_pontos)}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {selectedPrintItems.includes('ranking_turmas') && rankingTurmas.length > 0 && (
                <section>
                  <h4 className="text-[10px] font-black uppercase tracking-widest mb-4 border-l-4 border-slate-900 pl-2">Classificação por Turma</h4>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-900 text-white">
                        <tr>
                          <th className="px-6 py-3 text-[9px] uppercase font-black tracking-widest">Posição</th>
                          <th className="px-6 py-3 text-[9px] uppercase font-black tracking-widest">Identificação da Turma</th>
                          <th className="px-6 py-3 text-[9px] uppercase font-black tracking-widest text-right">Pontos Totais</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rankingTurmas.map((t, i) => (
                          <tr key={t.codigo_turma}>
                            <td className="px-6 py-4 font-black">{i + 1}º</td>
                            <td className="px-6 py-4 font-bold uppercase">{t.codigo_turma}</td>
                            <td className="px-6 py-4 font-black text-right text-indigo-600">{formatPoints(t.total_pontos)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {selectedPrintItems.includes('top_10_alunos') && rankingAlunos.length > 0 && (
                 <section>
                  <h4 className="text-[10px] font-black uppercase tracking-widest mb-4 border-l-4 border-slate-900 pl-2">Top Alunos Destaque</h4>
                   <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 text-slate-900">
                        <tr className="border-b-2 border-slate-900">
                          <th className="px-6 py-3 text-[9px] uppercase font-black tracking-widest">Pos</th>
                          <th className="px-6 py-3 text-[9px] uppercase font-black tracking-widest">Nome do Aluno</th>
                          <th className="px-6 py-3 text-[9px] uppercase font-black tracking-widest">Turma</th>
                          <th className="px-6 py-3 text-[9px] uppercase font-black tracking-widest text-right">Pontos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rankingAlunos.map((a, i) => (
                          <tr key={a.aluno_id}>
                            <td className="px-6 py-4 font-bold text-slate-400">{i + 1}º</td>
                            <td className="px-6 py-4 font-bold uppercase">{a.nome_completo}</td>
                            <td className="px-6 py-4 text-xs font-medium text-slate-500 uppercase">{a.codigo_turma}</td>
                            <td className="px-6 py-4 font-black text-right">{formatPoints(a.total_pontos)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                 </section>
              )}

              {selectedPrintItems.includes('obs_separacao_turnos') && (
                <div className="bg-slate-50 p-6 border-l-8 border-slate-900 font-bold text-xs text-slate-600 uppercase tracking-tight leading-relaxed">
                  Nota Informativa: Conforme regulamento da gincana, as pontuações e premiações são contabilizadas e disputadas de forma independente entre os turnos Matutino e Vespertino.
                </div>
              )}
            </div>

            <footer className="mt-20 pt-10 border-t-2 border-slate-900 flex flex-col sm:flex-row justify-between items-center sm:items-end gap-6 sm:gap-4 text-center sm:text-left">
               <div className="flex flex-col items-center sm:items-start gap-2">
                  <div className="w-56 h-0.5 bg-slate-900"></div>
                  <p className="text-[10px] font-black uppercase">Homologado pelo Coordenador</p>
                  <p className="text-[9px] text-slate-500 font-medium">Extraído em: {today} às {new Date().toLocaleTimeString('pt-BR')}</p>
               </div>
               <div className="text-center sm:text-right">
                  <p className="text-[10px] text-slate-900 font-black uppercase leading-tight">{SYSTEM_NAME}</p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">Cópia de Segurança do Ranking Oficial</p>
               </div>
            </footer>
          </div>
        </div>
      )}

      {/* View de Impressão Real do Ranking (Hidden on screen) */}
      <div className="hidden print:block text-black bg-white">
          <div className="flex flex-col items-center mb-8 border-b-2 border-black pb-4 text-center">
            <Logo fallbackSize="md" className="h-18 w-auto mb-2" />
            <h1 className="text-md font-black uppercase">{SCHOOL_NAME}</h1>
            <p className="text-[10px] font-bold uppercase">{SYSTEM_NAME}</p>
            <div className="mt-4 flex gap-4 text-[8px] font-bold uppercase text-slate-600">
               <span>Data: {today}</span>
               <span>Turno: {turnoLabel}</span>
            </div>
          </div>

          <h2 className="text-md font-black text-center uppercase border-2 border-black py-1 mb-6">Ranking de Arrecadação 2026</h2>

          <div className="space-y-8">
            {selectedPrintItems.includes('ranking_turmas') && (
               <div className="border border-black">
                 <div className="bg-black text-white px-2 py-1 text-[8px] font-black uppercase">Ranking de Turmas</div>
                 <table className="w-full text-left text-[9px] border-collapse">
                   <thead>
                     <tr className="border-b border-black">
                       <th className="px-2 py-1 uppercase">Pos</th>
                       <th className="px-2 py-1 uppercase">Turma</th>
                       <th className="px-2 py-1 uppercase text-right">Pontos</th>
                     </tr>
                   </thead>
                   <tbody>
                     {rankingTurmas.map((t, i) => (
                       <tr key={t.codigo_turma} className="border-b border-slate-100">
                         <td className="px-2 py-1 font-bold">{i+1}º</td>
                         <td className="px-2 py-1 uppercase">{t.codigo_turma}</td>
                         <td className="px-2 py-1 font-black text-right">{formatPoints(t.total_pontos)}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            )}
          </div>
          
          <div className="mt-16 pt-8 border-t border-black flex justify-between items-end">
             <div className="flex flex-col gap-1">
                <div className="w-32 h-[1px] bg-black"></div>
                <p className="text-[7px] font-bold uppercase">Fiscalização Geral</p>
             </div>
             <p className="text-[6px] text-slate-400 font-bold uppercase">Emitido via Antigravity Build System</p>
          </div>
      </div>

      <div className={cn("space-y-8 no-print", isPreviewOpen && "opacity-40 grayscale pointer-events-none")}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 flex items-center">
              <Trophy className="h-7 w-7 md:h-8 md:w-8 text-indigo-600 mr-3 shrink-0" />
              Ranking de Arrecadação 2026
            </h1>
            <p className="text-slate-500 text-xs md:text-sm">
              {turnoVisivel === 'geral' ? 'Visão Geral (Todos os Turnos combinados)' : `Competição - Turno ${turnoVisivel === 'manha' ? 'Manhã' : 'Tarde'}`}
            </p>
          </div>
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="w-full md:w-auto p-4 md:p-3 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2 font-black text-xs md:text-[10px] uppercase tracking-widest disabled:opacity-50 disabled:pointer-events-none"
            disabled={isPreviewOpen}
          >
            <Printer className="w-4 h-4" />
            Imprimir ranking do dia
          </button>
        </div>

      <div className="flex flex-col items-center space-y-4">
        {isFreeQuery && (
          <div className="bg-slate-100 p-1 rounded-xl flex space-x-1 mb-2 border border-slate-200">
            <button
              onClick={() => setTurnoVisivel('manha')}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                turnoVisivel === 'manha' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sun className="h-4 w-4 mr-2" /> Manhã
            </button>
            <button
              onClick={() => setTurnoVisivel('tarde')}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                turnoVisivel === 'tarde' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Moon className="h-4 w-4 mr-2" /> Tarde
            </button>
            <button
              onClick={() => setTurnoVisivel('geral')}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                turnoVisivel === 'geral' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Globe className="h-4 w-4 mr-2" /> Visão Geral
            </button>
          </div>
        )}

        <div className="bg-slate-200 p-1 rounded-xl flex space-x-1">
          <button
            onClick={() => setTab('TURMA')}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === 'TURMA' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Ranking de Turmas
          </button>
          <button
            onClick={() => setTab('ALUNO')}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === 'ALUNO' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Top 10 Alunos
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Buscando dados no Supabase...</p>
          </div>
        ) : (
          <>
            {tab === 'ALUNO' && (
              rankingAlunos.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-500">
                  Nenhum lançamento registrado ainda.
                </div>
              ) : (
                rankingAlunos.map((row, index) => (
                  <div 
                    key={row.aluno_id} 
                    className={`flex items-center p-4 rounded-xl border transition-all ${getPositionStyle(index)}`}
                  >
                    <div className="flex items-center justify-center w-12 h-12 shrink-0">
                      {getPositionIcon(index)}
                    </div>
                    
                    <div className="pl-4 flex-1">
                      <h3 className={`font-bold ${index < 3 ? 'text-lg text-slate-800' : 'text-slate-700'}`}>
                        {row.nome_completo}
                      </h3>
                      <div className="flex items-center text-sm text-slate-500 mt-1 space-x-3">
                        <span>Turma: {row.codigo_turma}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span>Turno: {row.turno.toLowerCase() === 'manha' || row.turno.toLowerCase() === 'manhã' ? 'Manhã' : 'Tarde'}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-black text-indigo-600">
                        {formatPoints(row.total_pontos)}
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pontos</span>
                    </div>
                  </div>
                ))
              )
            )}

            {tab === 'TURMA' && (
              rankingTurmas.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-500">
                  Nenhum lançamento registrado ainda.
                </div>
              ) : (
                rankingTurmas.map((row, index) => (
                  <div 
                    key={row.codigo_turma + row.turno} 
                    className={`flex items-center p-5 rounded-xl border transition-all ${getPositionStyle(index)}`}
                  >
                    <div className="flex items-center justify-center w-12 h-12 shrink-0">
                      {getPositionIcon(index)}
                    </div>
                    
                    <div className="pl-4 flex-1">
                      <h3 className={`font-bold flex items-center ${index < 3 ? 'text-xl text-slate-800' : 'text-lg text-slate-700'}`}>
                        <Users className="h-5 w-5 mr-2 text-slate-400" />
                        {row.codigo_turma}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">Turno: {row.turno.toLowerCase() === 'manha' || row.turno.toLowerCase() === 'manhã' ? 'Manhã' : 'Tarde'}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-3xl font-black text-emerald-600">
                        {formatPoints(row.total_pontos)}
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pontos</span>
                    </div>
                  </div>
                ))
              )
            )}
          </>
        )}
      </div>

      {isFreeQuery && turnoVisivel === 'geral' && rankingTurnos.length > 0 && (
        <div className="mt-12 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Globe className="w-6 h-6 text-indigo-600" />
            Resumo por Turno
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rankingTurnos.map(item => (
              <div key={item.turno} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {item.turno.toLowerCase() === 'manhã' || item.turno.toLowerCase() === 'manha' ? <Sun className="text-amber-500" /> : <Moon className="text-indigo-600" />}
                    <span className="font-bold text-slate-700 uppercase">{item.turno.toLowerCase() === 'manhã' || item.turno.toLowerCase() === 'manha' ? 'Manhã' : 'Tarde'}</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {formatPoints(item.total_pontos)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
);
}
