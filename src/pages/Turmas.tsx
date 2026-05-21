import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Search, 
  X, 
  GraduationCap, 
  Award,
  BookOpen,
  UserCheck,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';

interface Aluno {
  id: string;
  matricula: string;
  nome_completo: string;
  codigo_turma: string;
  turno: string;
  status: string;
}

interface Turma {
  codigo_turma: string;
  nome_turma: string;
  turno: string;
  status: string;
}

export function Turmas() {
  const { profile } = useAuth();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // States of search and selection
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  useEffect(() => {
    fetchTurmasEAlunos();
  }, [profile]);

  const normalizeTurno = (t: string): string => {
    if (!t) return '';
    return t.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  };

  const getTurnoExibicao = (turnoRaw: string): string => {
    const norm = normalizeTurno(turnoRaw);
    if (norm === 'manha') return 'Manhã';
    if (norm === 'tarde') return 'Tarde';
    if (norm === 'ambos') return 'Integral';
    return turnoRaw;
  };

  const fetchTurmasEAlunos = async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);

    try {
      // Determines shift limitation based on user profile and preferences
      const restrictedTurno = (() => {
        if (profile.perfil === 'admin') return null;
        if (profile.perfil === 'consulta' && profile.turno === 'ambos') return null;
        if (profile.perfil === 'manha') return 'manha';
        if (profile.perfil === 'tarde') return 'tarde';
        if (profile.turno === 'manha') return 'manha';
        if (profile.turno === 'tarde') return 'tarde';
        return null;
      })();

      // 1. Fetch Turmas
      let turmasQuery = supabase.from('turmas').select('*');
      
      const { data: turmasData, error: turmasError } = await turmasQuery;
      if (turmasError) throw turmasError;

      // 2. Fetch Alunos
      let alunosQuery = supabase.from('alunos').select('*');
      
      const { data: alunosData, error: alunosError } = await alunosQuery;
      if (alunosError) throw alunosError;

      let fetchedTurmas = (turmasData || []) as Turma[];
      let fetchedAlunos = (alunosData || []) as Aluno[];

      // Client-side filtering to ensure absolute resilience and turn consistency
      if (restrictedTurno) {
        fetchedTurmas = fetchedTurmas.filter(t => normalizeTurno(t.turno) === restrictedTurno);
        fetchedAlunos = fetchedAlunos.filter(a => normalizeTurno(a.turno) === restrictedTurno);
      }

      setTurmas(fetchedTurmas);
      setAlunos(fetchedAlunos);
    } catch (err: any) {
      console.error('Erro ao buscar turmas e alunos:', err);
      setError(err.message || 'Falha ao sincronizar dados com o Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const getAlunosDaTurma = (codigo_turma: string, turno: string) => {
    return alunos.filter(a => 
      a.codigo_turma?.trim().toLowerCase() === codigo_turma?.trim().toLowerCase() &&
      normalizeTurno(a.turno) === normalizeTurno(turno)
    );
  };

  // Filtered turmas list for the primary dashboard grid
  const filteredTurmas = turmas.filter(t => 
    t.nome_turma?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.codigo_turma?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter and sort students inside the selected school class
  const getFilteredAndSortedStudentsOfSelectedTurma = () => {
    if (!selectedTurma) return [];
    const turmaStudents = getAlunosDaTurma(selectedTurma.codigo_turma, selectedTurma.turno);
    
    // Filter matching search term
    const searched = turmaStudents.filter(s => 
      s.nome_completo?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
      s.matricula?.includes(studentSearchTerm)
    );

    // Sort alphabetically by full name
    return searched.sort((a, b) => 
      (a.nome_completo || '').localeCompare(b.nome_completo || '')
    );
  };

  const activeTurmasCount = turmas.filter(t => t.status?.toLowerCase() === 'ativo' || t.status?.toLowerCase() === 'ativa').length;
  const totalStudentsInFilteredTurmas = turmas.reduce((acc, current) => {
    return acc + getAlunosDaTurma(current.codigo_turma, current.turno).length;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 block mb-1">Visão Geral do Sistema</span>
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-800">Turmas</h1>
          <p className="text-slate-500 text-sm">Consulte as turmas e a listagem de alunos cadastrados por turno.</p>
        </div>
      </div>

      {/* Metrics Dashboard Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total de Turmas</p>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{turmas.length}</h3>
          </div>
          <div className="h-10 w-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-600">
            <BookOpen className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Turmas Ativas</p>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{activeTurmasCount}</h3>
          </div>
          <div className="h-10 w-10 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Alunos Atendidos</p>
            <h3 className="text-2xl font-black text-indigo-600 tracking-tight">{totalStudentsInFilteredTurmas}</h3>
          </div>
          <div className="h-10 w-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
            <Users className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
        
        {/* Search header bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por código ou nome de turma..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:focus:ring-indigo-500/10 focus:border-slate-900 outline-none transition-all text-sm font-medium placeholder-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Classes grid/list section */}
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="text-xs uppercase font-black tracking-widest text-slate-400">Buscando informações escolares...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center bg-red-50 rounded-2xl border border-red-100 p-6">
            <p className="text-sm font-bold text-red-700 uppercase tracking-wider mb-1">Ops! Ocorreu um erro</p>
            <p className="text-xs text-red-500 font-medium">{error}</p>
          </div>
        ) : filteredTurmas.length > 0 ? (
          <>
            {/* Desktop & Tablet Table view */}
            <div className="hidden md:block overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                    <th className="py-4 px-5">Cód. Turma</th>
                    <th className="py-4 px-5">Nome da Turma</th>
                    <th className="py-4 px-5">Turno</th>
                    <th className="py-4 px-5 text-center">Status</th>
                    <th className="py-4 px-5 text-center">Nº Alunos</th>
                    <th className="py-4 px-5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredTurmas.map((turma) => {
                    const turmaAlunosCount = getAlunosDaTurma(turma.codigo_turma, turma.turno).length;
                    const isAtivo = turma.status?.toLowerCase() === 'ativo' || turma.status?.toLowerCase() === 'ativa';
                    
                    return (
                      <tr key={turma.codigo_turma + turma.turno} className="hover:bg-slate-50/50 transition-all">
                        <td className="py-4 px-5 font-mono font-bold text-slate-900 text-sm">
                          {turma.codigo_turma}
                        </td>
                        <td className="py-4 px-5 text-slate-800 font-semibold text-sm">
                          {turma.nome_turma || '--'}
                        </td>
                        <td className="py-4 px-5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-extrabold tracking-wide uppercase ${
                            normalizeTurno(turma.turno) === 'manha'
                              ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-700/10' 
                              : 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10'
                          }`}>
                            {getTurnoExibicao(turma.turno)}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isAtivo 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {isAtivo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-center">
                          <span className="inline-flex items-center justify-center p-1.5 min-w-[2rem] bg-slate-100 text-slate-700 font-black text-xs rounded-lg">
                            {turmaAlunosCount}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right">
                          <button
                            onClick={() => setSelectedTurma(turma)}
                            className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors select-none px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100/80 cursor-pointer"
                          >
                            Ver alunos
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards view */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredTurmas.map((turma) => {
                const turmaAlunosCount = getAlunosDaTurma(turma.codigo_turma, turma.turno).length;
                const isAtivo = turma.status?.toLowerCase() === 'ativo' || turma.status?.toLowerCase() === 'ativa';

                return (
                  <div 
                    key={turma.codigo_turma + turma.turno} 
                    className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 cursor-pointer hover:border-indigo-400 active:bg-slate-50 transition-all"
                    onClick={() => setSelectedTurma(turma)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <span className="font-mono font-black text-slate-900 border border-slate-200 px-2 py-0.5 rounded-md text-xs bg-slate-50">
                          {turma.codigo_turma}
                        </span>
                        <h4 className="font-extrabold text-slate-800 text-sm mt-2">{turma.nome_turma || '--'}</h4>
                      </div>
                      <span className={`text-[10px] font-bold uppercase py-0.5 px-2 rounded-full ${
                        isAtivo 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {isAtivo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          normalizeTurno(turma.turno) === 'manha'
                            ? 'bg-amber-50 text-amber-700' 
                            : 'bg-blue-50 text-blue-700'
                        }`}>
                          {getTurnoExibicao(turma.turno)}
                        </span>
                        
                        <span className="text-[10px] text-slate-400 font-bold block">
                          • {turmaAlunosCount} alunos
                        </span>
                      </div>

                      <span className="text-xs font-black uppercase text-indigo-600 flex items-center gap-1">
                        Ver Lista
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="py-20 text-center text-slate-400 font-medium">
            Nenhuma turma encontrada correspondente aos termos informados.
          </div>
        )}
      </div>

      {/* Slide-over / Overlay Modal for Class Students List */}
      <AnimatePresence>
        {selectedTurma && (() => {
          const students = getFilteredAndSortedStudentsOfSelectedTurma();
          const totalInTurma = getAlunosDaTurma(selectedTurma.codigo_turma, selectedTurma.turno).length;

          return (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-end z-50 p-0 sm:p-4 select-none"
              onClick={() => {
                setSelectedTurma(null);
                setStudentSearchTerm('');
              }}
            >
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                onClick={(e) => e.stopPropagation()} // stop auto close
                className="w-full max-w-2xl bg-white h-full sm:h-[calc(100vh-2rem)] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-100"
              >
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-150 flex items-start justify-between bg-slate-50/80">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-[11px] bg-slate-900 text-white px-2.5 py-0.5 rounded">
                        {selectedTurma.codigo_turma}
                      </span>
                      <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                        {getTurnoExibicao(selectedTurma.turno)}
                      </span>
                    </div>
                    <h2 className="text-lg font-black text-slate-950 uppercase tracking-tight">
                      {selectedTurma.nome_turma || 'Alunos da Turma'}
                    </h2>
                    <p className="text-slate-500 text-xs">
                      Lista ordenada com os {totalInTurma} alunos vinculados.
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedTurma(null);
                      setStudentSearchTerm('');
                    }}
                    className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors rounded-xl cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Modal Search Filter */}
                <div className="px-6 py-4 border-b border-slate-100">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Pesquisar por nome ou matrícula nesta turma..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-100/50 hover:bg-slate-100 border border-slate-200/80 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all text-xs font-semibold"
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Modal Students Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {students.length > 0 ? (
                    <>
                      {/* Desktop list style table */}
                      <div className="hidden sm:block border border-slate-100 rounded-xl overflow-hidden">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 uppercase font-bold text-[9px] tracking-wider">
                              <th className="py-3 px-4">Matrícula</th>
                              <th className="py-3 px-4">Nome do Aluno</th>
                              <th className="py-3 px-4 text-center">Status Atividade</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 font-medium">
                            {students.map((student) => {
                              const isActive = student.status?.toLowerCase() === 'ativo' || student.status?.toLowerCase() === 'ativa';
                              
                              return (
                                <tr key={student.id} className="hover:bg-slate-50/40">
                                  <td className="py-3.5 px-4 font-mono text-slate-500">{student.matricula}</td>
                                  <td className="py-3.5 px-4 text-slate-800 font-bold uppercase">{student.nome_completo}</td>
                                  <td className="py-3.5 px-4 text-center">
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                      isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                    }`}>
                                      {isActive ? 'Ativo' : 'Inativo'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Cards stack inside modal */}
                      <div className="block sm:hidden space-y-3">
                        {students.map((student) => {
                          const isActive = student.status?.toLowerCase() === 'ativo' || student.status?.toLowerCase() === 'ativa';

                          return (
                            <div key={student.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-slate-500">{student.matricula}</span>
                                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                  isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                }`}>
                                  {isActive ? 'Ativo' : 'Inativo'}
                                </span>
                              </div>
                              <p className="font-black text-slate-800 uppercase leading-snug">{student.nome_completo}</p>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : totalInTurma === 0 ? (
                    <div className="py-16 text-center space-y-2">
                       <div className="h-12 w-12 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 mx-auto">
                         <Users className="h-5 w-5" />
                       </div>
                       <p className="font-bold text-slate-700 text-sm">Nenhum aluno cadastrado nesta turma.</p>
                       <p className="text-xs text-slate-400 max-w-xs mx-auto">Nenhum aluno foi associado com a chave desta turma ({selectedTurma.codigo_turma}) no turno ({getTurnoExibicao(selectedTurma.turno)}) ainda.</p>
                    </div>
                  ) : (
                    <div className="py-16 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                      Sem resultados para "{studentSearchTerm}" nesta busca.
                    </div>
                  )}
                </div>

                {/* Modal Footer (Information Banner) */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 font-medium flex items-center gap-1.5 shrink-0 select-none">
                  <Info className="h-4.5 w-4.5 text-indigo-500" />
                  <span>Esta visualização é somente leitura. Não é permitido criar, editar ou excluir alunos deste módulo.</span>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
