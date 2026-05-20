import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockRecibos, mockAlunos, mockTurmas, mockUsuarios, mockPrendas } from '../lib/mock-data';
import { formatPoints } from '../lib/utils';
import { Printer, ArrowLeft, Zap } from 'lucide-react';
import { Logo } from '../components/Logo';
import { SYSTEM_NAME, SCHOOL_NAME } from '../constants';

export function ReciboView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const recibo = mockRecibos.find(r => r.id === id);
  
  if (!recibo) {
    return <div className="p-6 text-center text-rose-600 font-bold uppercase tracking-wide">Recibo não encontrado.</div>;
  }

  const aluno = mockAlunos.find(a => a.id === recibo.alunoId);
  const turma = mockTurmas.find(t => t.id === recibo.turmaId);
  const usuario = mockUsuarios.find(u => u.id === recibo.usuarioId);

  // Componente que renderiza uma via do recibo
  const ViaRecibo = ({ title }: { title: string }) => (
    <div className="border border-slate-300 p-4 md:p-8 rounded-2xl bg-white mb-8 print:border-none print:shadow-none print:mb-12 print:p-0 relative overflow-hidden">
      {recibo.status === 'cancelado' && (
        <div className="space-y-2 mb-4">
          <div className="bg-rose-600 text-white font-black text-center py-2 px-4 rounded-lg uppercase tracking-widest text-xs animate-pulse print:bg-rose-100 print:text-rose-800 print:border print:border-rose-300">
            ⚠️ ESTE RECIBO FOI CANCELADO / ANULADO
          </div>
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs space-y-1 block print:border-rose-300 print:bg-rose-50/50">
            <p className="font-extrabold uppercase text-[10px] tracking-wider text-rose-700">Audit de Atividades de Segurança</p>
            <p><span className="font-semibold text-slate-700">Cancelado por:</span> {recibo.cancelado_por || 'Administrador (Manual)'}</p>
            <p><span className="font-semibold text-slate-700">Data e Hora:</span> {recibo.cancelado_em ? new Date(recibo.cancelado_em).toLocaleString('pt-BR') : 'Não informada'}</p>
            <p><span className="font-semibold text-slate-700">Motivo Especificado:</span> {recibo.motivo_cancelamento || 'Motivo não registrado'}</p>
          </div>
        </div>
      )}

      {recibo.status === 'cancelado' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-30 opacity-[0.22] overflow-hidden">
          <div className="text-red-700 font-extrabold border-[10px] border-red-700 border-dashed rounded-3xl text-5xl sm:text-7xl md:text-8xl p-4 sm:p-6 uppercase tracking-widest -rotate-12">
            CANCELADO
          </div>
        </div>
      )}

      <div className="text-center mb-8 border-b border-slate-200 pb-6 relative">
        <div className="flex justify-center mb-4">
          <Logo fallbackSize="xl" className="h-20 w-auto" />
        </div>
        <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-800">{SYSTEM_NAME}</h2>
        <h3 className="text-lg md:text-xl font-black text-indigo-700 mt-1">Recibo de Entrega de Prendas</h3>
        <p className="text-xs md:text-sm font-black text-slate-400 mt-2 uppercase tracking-widest">{title}</p>
        <p className="text-[10px] md:text-xs font-black text-slate-500 mt-1 uppercase tracking-widest leading-none">{SCHOOL_NAME}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs md:text-sm mb-6 border border-slate-200 p-4 rounded-xl bg-slate-50">
        <div className="space-y-1">
          <p className="font-medium text-slate-600"><strong className="text-slate-900">Número:</strong> {recibo.numero}</p>
          <p className="font-medium text-slate-600"><strong className="text-slate-900">Data/Hora:</strong> {new Date(recibo.dataHora).toLocaleString('pt-BR')}</p>
          <p className="font-medium text-slate-600"><strong className="text-slate-900">Responsável:</strong> {recibo.usuario_responsavel_nome || usuario?.nome || 'Operador'}</p>
        </div>
        <div className="space-y-1">
          <p className="font-medium text-slate-600"><strong className="text-slate-900">Aluno:</strong> {recibo.aluno_nome || aluno?.nome || 'Não informado'}</p>
          <p className="font-medium text-slate-600"><strong className="text-slate-900">Matrícula:</strong> {recibo.aluno_matricula || aluno?.matricula || 'Não informada'}</p>
          <p className="font-medium text-slate-600">
            <strong className="text-slate-900">Turma:</strong> {recibo.aluno_turma || turma?.nome || 'Não informada'} – <span className="uppercase font-bold text-xs">{((recibo.aluno_turno || recibo.turno) === 'manha' || (recibo.aluno_turno || recibo.turno) === 'manhã') ? 'Manhã' : 'Tarde'}</span>
          </p>
        </div>
      </div>

      <div className="overflow-x-auto w-full max-w-full">
        <table className="w-full text-left text-xs md:text-sm mb-6 border-collapse min-w-[500px]">
          <thead>
            <tr className="border-b-2 border-slate-800">
              <th className="py-2.5 font-bold uppercase text-[10px] tracking-wider text-slate-900">Item/Prenda</th>
              <th className="py-2.5 text-center font-bold uppercase text-[10px] tracking-wider text-slate-900">Qtd</th>
              <th className="py-2.5 text-right font-bold uppercase text-[10px] tracking-wider text-slate-900">Pts Base</th>
              <th className="py-2.5 text-center font-bold uppercase text-[10px] tracking-wider text-slate-900">Mult.</th>
              <th className="py-2.5 text-right font-bold uppercase text-[10px] tracking-wider text-slate-900">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {recibo.itens.map((item, idx) => {
              const prenda = mockPrendas.find(p => p.id === item.prendaId);
              const nomePrendaExibicao = item.nome_prenda || prenda?.nome || 'Item desconhecido';
              const variacaoExibicao = item.variacao || prenda?.variacao;
              return (
                <tr key={idx} className="text-slate-700">
                  <td className="py-3">
                    <div className="flex items-center font-semibold">
                      <span>{nomePrendaExibicao}{variacaoExibicao ? ` — ${variacaoExibicao}` : ''}</span>
                      {item.campanhaAplicada && <Zap className="h-3.5 w-3.5 text-amber-500 ml-1.5 shrink-0" />}
                    </div>
                  </td>
                  <td className="py-3 text-center font-bold">{item.quantidade}</td>
                  <td className="py-3 text-right text-slate-400 font-mono text-xs">{item.pontuacaoBase}</td>
                  <td className="py-3 text-center">
                    {item.multiplicadorAplicado > 1 ? (
                      <span className="p-1 rounded bg-amber-100 text-amber-800 text-[9px] font-black uppercase">
                        {item.multiplicadorAplicado}x
                      </span>
                    ) : <span className="text-slate-300 text-xs">1x</span>}
                  </td>
                  <td className="py-3 text-right font-black text-slate-900">{formatPoints(item.subtotal)} pts</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-800 font-extrabold text-base md:text-lg">
              <td colSpan={4} className="py-4 text-right">Total Geral de Pontos:</td>
              <td className="py-4 text-right text-indigo-700">{formatPoints(recibo.total_pontos)} pts</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {recibo.observacao && (
        <div className="mb-6 p-4 bg-slate-50 border border-slate-250 rounded-2xl text-xs md:text-sm text-slate-700 italic">
          <strong className="text-slate-900 not-italic font-bold">Observação geral:</strong> {recibo.observacao}
        </div>
      )}

      <div className="mt-12 flex flex-col sm:flex-row justify-between items-center sm:items-start gap-8 sm:gap-4 px-4 md:px-12 print:flex-row print:justify-between print:px-12 print:mt-16">
        <div className="text-center w-64 border-t border-slate-800 pt-2 shrink-0">
          <p className="text-xs md:text-sm font-bold text-slate-800">{recibo.usuario_responsavel_nome || usuario?.nome || 'Operador'}</p>
          <p className="text-[10px] md:text-xs text-slate-500 uppercase font-semibold mt-0.5">Escola (Recebedor)</p>
        </div>
        <div className="text-center w-64 border-t border-slate-800 pt-2 shrink-0">
          <p className="text-xs md:text-sm">&nbsp;</p>
          <p className="text-[10px] md:text-xs text-slate-500 uppercase font-semibold mt-0.5">Responsável pela entrega / Entregador</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-full sm:max-w-4xl mx-auto py-6 px-4 md:px-0 print:py-0 print:max-w-full print:px-0 box-border">
      {/* Botões - escondidos na impressão */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print:hidden border-b border-slate-200 pb-4">
        <button 
          onClick={() => navigate('/lancamento')}
          className="w-full sm:w-auto flex items-center justify-center text-xs uppercase font-black tracking-widest text-slate-600 hover:text-slate-900 bg-slate-150 py-3.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Novo Lançamento
        </button>
        <button 
          onClick={() => window.print()}
          className="w-full sm:w-auto flex items-center justify-center bg-indigo-600 text-white py-3.5 px-6 rounded-xl text-xs uppercase font-black tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 active:scale-95 cursor-pointer"
        >
          <Printer className="h-4 w-4 mr-2" /> Imprimir Recibo
        </button>
      </div>

      <div className="print:block w-full max-w-full">
        <ViaRecibo title="Via 1 - Escola" />
        <div className="border-t-2 border-dashed border-slate-300 my-8 print:my-10 print:border-slate-800"></div>
        <ViaRecibo title="Via 2 - Responsável/Entregador" />
      </div>
    </div>
  );
}

