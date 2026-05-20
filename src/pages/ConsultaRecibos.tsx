import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { mockRecibos, mockAlunos, mockTurmas, mockUsuarios, cancelMockRecibo } from '../lib/mock-data';
import { formatPoints } from '../lib/utils';
import { Search, Eye, Ban, Filter, AlertCircle } from 'lucide-react';

export function ConsultaRecibos() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [busca, setBusca] = useState('');
  const [recibosList, setRecibosList] = useState(mockRecibos);

  // Estados para Auditoria de Cancelamento
  const [modalCancelamentoOpen, setModalCancelamentoOpen] = useState(false);
  const [reciboParaCancelar, setReciboParaCancelar] = useState<{ id: string, numero: string } | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [erroCancelamento, setErroCancelamento] = useState('');

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
      const canceladoPor = `${profile.nome} (${profile.perfil === 'admin' ? 'Administrador' : profile.perfil === 'manha' ? 'Operador Manhã' : 'Operador Tarde'})`;
      cancelMockRecibo(reciboParaCancelar.id, canceladoPor, motivoCancelamento.trim());
      setRecibosList([...mockRecibos]);
      setModalCancelamentoOpen(false);
      setReciboParaCancelar(null);
      setMotivoCancelamento('');
    }
  };
  
  // Apenas admin vê todos, outros veem apenas do seu turno
  const baseRecibos = profile?.perfil === 'admin' 
    ? recibosList 
    : recibosList.filter(r => r.turno.toLowerCase() === profile?.turno);

  const recibosFiltrados = baseRecibos.filter(r => {
    if (!busca) return true;
    const searchLower = busca.toLowerCase();
    const aluno = mockAlunos.find(a => a.id === r.alunoId);
    const nomeAluno = (r.aluno_nome || aluno?.nome || '').toLowerCase();
    const matriculaAluno = r.aluno_matricula || aluno?.matricula || '';
    
    return (
      r.numero.toLowerCase().includes(searchLower) ||
      nomeAluno.includes(searchLower) ||
      matriculaAluno.includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Consulta de Recibos</h1>
      </div>

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
              {recibosFiltrados.length === 0 ? (
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
                  
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          r.status.toLowerCase() === 'ativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {r.status.toLowerCase() === 'ativo' ? 'Ativo' : 'Cancelado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800">#{r.numero}</td>
                      <td className="px-6 py-4 text-slate-600">{new Date(r.dataHora).toLocaleDateString('pt-BR')}</td>
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
                          <button 
                            onClick={() => navigate(`/recibo/${r.id}`)}
                            className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-1.5 rounded-md cursor-pointer"
                            title="Visualizar / Imprimir"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {profile?.perfil === 'admin' && r.status.toLowerCase() === 'ativo' && (
                            <button 
                              className="text-rose-600 hover:text-rose-900 bg-rose-50 p-1.5 rounded-md cursor-pointer"
                              title="Cancelar Recibo"
                              onClick={() => handleCancelarClick(r.id, r.numero)}
                            >
                              <Ban className="h-4 w-4" />
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

      {/* Modal de Auditoria de Cancelamento */}
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
