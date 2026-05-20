import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Search, Users } from 'lucide-react';

interface Aluno {
  id: string;
  matricula: string;
  nome_completo: string;
  codigo_turma: string;
  turno: string;
  status: string;
}

export function Alunos() {
  const { profile } = useAuth();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAlunos();
  }, [profile]);

  const fetchAlunos = async () => {
    if (!profile) return;
    setLoading(true);

    try {
      let query = supabase.from('alunos').select('*').order('nome_completo', { ascending: true });

      if (profile.perfil === 'manha') {
        query = query.eq('turno', 'manha');
      } else if (profile.perfil === 'tarde') {
        query = query.eq('turno', 'tarde');
      }

      const { data, error } = await query;
      if (error) throw error;
      setAlunos(data || []);
    } catch (err) {
      console.error('Erro ao buscar alunos:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAlunos = alunos.filter(a => 
    a.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.matricula.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Alunos</h1>
          <p className="text-slate-500">Listagem de alunos cadastrados no sistema.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome ou matrícula..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 italic text-slate-500 text-sm">
                <th className="py-3 px-4 font-medium">Matrícula</th>
                <th className="py-3 px-4 font-medium">Nome Completo</th>
                <th className="py-3 px-4 font-medium">Turma</th>
                <th className="py-3 px-4 font-medium">Turno</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 uppercase text-xs tracking-widest font-bold">
                    Carregando alunos...
                  </td>
                </tr>
              ) : filteredAlunos.length > 0 ? (
                filteredAlunos.map((aluno) => (
                  <tr key={aluno.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-sm text-slate-600">{aluno.matricula}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{aluno.nome_completo}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold ring-1 ring-inset ring-blue-700/10">
                        <Users className="w-3 h-3" />
                        {aluno.codigo_turma}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ring-1 ring-inset ${
                        aluno.turno.toLowerCase() === 'manha' || aluno.turno.toLowerCase() === 'manhã'
                          ? 'bg-amber-50 text-amber-700 ring-amber-700/10' 
                          : 'bg-indigo-50 text-indigo-700 ring-indigo-700/10'
                      }`}>
                        {aluno.turno.toLowerCase() === 'manha' || aluno.turno.toLowerCase() === 'manhã' ? 'Manhã' : 'Tarde'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 font-medium">
                    Nenhum aluno encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
