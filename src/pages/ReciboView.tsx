import { useParams, useNavigate } from 'react-router-dom';
import { mockRecibos, mockAlunos, mockTurmas, mockPrendas } from '../lib/mock-data';
import { formatPoints } from '../lib/utils';
import { Printer, ArrowLeft, Zap } from 'lucide-react';
import { Logo } from '../components/Logo';
import { SYSTEM_NAME, SCHOOL_NAME } from '../constants';

export function ReciboView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const formatarDataBR = (dateStr?: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const recibo = mockRecibos.find(r => r.id === id);

  if (!recibo) {
    return (
      <div className="p-6 text-center text-rose-600 font-bold uppercase tracking-wide">
        Recibo não encontrado.
      </div>
    );
  }

  const aluno = mockAlunos.find(a => a.id === recibo.alunoId);
  const turma = mockTurmas.find(t => t.id === recibo.turmaId);

  const turnoDoRecibo = String(recibo.aluno_turno || recibo.turno || '')
    .toLowerCase()
    .trim();

  const isTurnoManha =
    turnoDoRecibo === 'manha' ||
    turnoDoRecibo === 'manhã' ||
    turnoDoRecibo === 'matutino';

  const isTurnoTarde =
    turnoDoRecibo === 'tarde' ||
    turnoDoRecibo === 'vespertino';

  const responsavelRecebimentoLabel = isTurnoManha
    ? 'Turno matutino'
    : isTurnoTarde
      ? 'Turno vespertino'
      : 'Coordenação / Administração';

  const turnoLabel = isTurnoManha
    ? 'Manhã'
    : isTurnoTarde
      ? 'Tarde'
      : 'Geral';

  // Componente que renderiza uma via do recibo
  const ViaRecibo = ({ title }: { title: string }) => (
    <div className="border border-slate-300 p-4 md:p-8 rounded-2xl bg-white mb-8 print:border print:border-slate-300 print:rounded-2xl print:p-5 print:mb-2 print:shadow-none relative overflow-hidden">
      {recibo.status === 'cancelado' && (
        <div className="space-y-2 mb-4 print:mb-2 print:space-y-1">
          <div className="bg-rose-600 text-white font-black text-center py-2 px-4 rounded-lg uppercase tracking-widest text-xs animate-pulse print:bg-rose-100 print:text-rose-800 print:border print:border-rose-300 print:py-1">
            ⚠️ ESTE RECIBO FOI CANCELADO / ANULADO
          </div>

          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs space-y-1 block print:border-rose-300 print:bg-rose-50/50 print:p-2">
            <p className="font-extrabold uppercase text-[10px] tracking-wider text-rose-700 print:text-[9px]">
              Audit de Atividades de Segurança
            </p>
            <p className="print:text-[10px]">
              <span className="font-semibold text-slate-700">Cancelado por:</span>{' '}
              {recibo.cancelado_por || 'Administrador (Manual)'}
            </p>
            <p className="print:text-[10px]">
              <span className="font-semibold text-slate-700">Data e Hora:</span>{' '}
              {recibo.cancelado_em
                ? new Date(recibo.cancelado_em).toLocaleString('pt-BR')
                : 'Não informada'}
            </p>
            <p className="print:text-[10px]">
              <span className="font-semibold text-slate-700">Motivo Especificado:</span>{' '}
              {recibo.motivo_cancelamento || 'Motivo não registrado'}
            </p>
          </div>
        </div>
      )}

      {recibo.status === 'cancelado' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-30 opacity-[0.22] overflow-hidden">
          <div className="text-red-700 font-extrabold border-[10px] border-red-700 border-dashed rounded-3xl text-5xl sm:text-7xl md:text-8xl p-4 sm:p-6 uppercase tracking-widest -rotate-12 print:text-5xl print:border-[6px] print:p-2">
            CANCELADO
          </div>
        </div>
      )}

      <div className="text-center mb-8 border-b border-slate-200 pb-6 relative print:mb-3 print:pb-3">
        <div className="flex justify-center mb-4 print:mb-1.5">
          <Logo fallbackSize="xl" className="h-20 w-auto print:h-12" />
        </div>

        <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-800 print:text-base">
          {SYSTEM_NAME}
        </h2>

        <h3 className="text-lg md:text-xl font-black text-indigo-700 mt-1 print:text-sm print:mt-0.5">
          Recibo de Entrega de Prendas
        </h3>

        <p className="text-xs md:text-sm font-black text-slate-400 mt-2 uppercase tracking-widest print:text-[10px] print:mt-1">
          {title}
        </p>

        <p className="text-[10px] md:text-xs font-black text-slate-500 mt-1 uppercase tracking-widest leading-none print:text-[9px] print:mt-0.5">
          {SCHOOL_NAME}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs md:text-sm mb-6 border border-slate-200 p-4 rounded-xl bg-slate-50 print:grid-cols-2 print:gap-1.5 print:p-3 print:mb-3 print:bg-white print:border-slate-300 print:text-[11px]">
        <div className="space-y-1 print:space-y-0.5">
          <p className="font-medium text-slate-600">
            <strong className="text-slate-900">Número:</strong> {recibo.numero}
          </p>

          <p className="font-medium text-slate-600">
            <strong className="text-slate-900">Data/Hora:</strong>{' '}
            {new Date(recibo.dataHora).toLocaleString('pt-BR')}
          </p>

          {recibo.data_lancamento && (
            <p className="font-medium text-slate-600 flex items-center gap-1.5 flex-wrap">
              <strong className="text-slate-900">Data de Referência:</strong>{' '}
              <span className="font-semibold text-slate-800">{formatarDataBR(recibo.data_lancamento)}</span>
              {recibo.lancamento_retroativo && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 border border-amber-200 text-amber-800 text-[8px] font-black uppercase tracking-wider print:border-amber-300">
                  Lançamento retroativo
                </span>
              )}
            </p>
          )}

          <p className="font-medium text-slate-600">
            <strong className="text-slate-900">Responsável:</strong>{' '}
            {responsavelRecebimentoLabel}
          </p>
        </div>

        <div className="space-y-1 print:space-y-0.5">
          <p className="font-medium text-slate-600">
            <strong className="text-slate-900">Aluno:</strong>{' '}
            {recibo.aluno_nome || aluno?.nome || 'Não informado'}
          </p>

          <p className="font-medium text-slate-600">
            <strong className="text-slate-900">Matrícula:</strong>{' '}
            {recibo.aluno_matricula || aluno?.matricula || 'Não informada'}
          </p>

          <p className="font-medium text-slate-600">
            <strong className="text-slate-900">Turma:</strong>{' '}
            {recibo.aluno_turma || turma?.nome || 'Não informada'} –{' '}
            <span className="uppercase font-bold text-xs">{turnoLabel}</span>
          </p>
        </div>
      </div>

      <div className="overflow-x-auto w-full max-w-full">
        <table className="w-full text-left text-xs md:text-sm mb-6 border-collapse min-w-[500px] print:mb-3 print:text-[11px] print:min-w-0">
          <thead>
            <tr className="border-b-2 border-slate-800">
              <th className="py-2.5 font-bold uppercase text-[10px] tracking-wider text-slate-900 print:py-1 print:text-[9px]">
                Item/Prenda
              </th>
              <th className="py-2.5 text-center font-bold uppercase text-[10px] tracking-wider text-slate-900 print:py-1 print:text-[9px]">
                Qtd
              </th>
              <th className="py-2.5 text-right font-bold uppercase text-[10px] tracking-wider text-slate-900 print:py-1 print:text-[9px]">
                Pts Base
              </th>
              <th className="py-2.5 text-center font-bold uppercase text-[10px] tracking-wider text-slate-900 print:py-1 print:text-[9px]">
                Mult.
              </th>
              <th className="py-2.5 text-right font-bold uppercase text-[10px] tracking-wider text-slate-900 print:py-1 print:text-[9px]">
                Subtotal
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {recibo.itens.map((item, idx) => {
              const prenda = mockPrendas.find(p => p.id === item.prendaId);
              const nomePrendaExibicao =
                item.nome_prenda || prenda?.nome_prenda || prenda?.nome || 'Item desconhecido';
              
              let variacaoExibicao = item.variacao || prenda?.variacao;
              if (variacaoExibicao && variacaoExibicao.trim().toLowerCase() === 'regular') {
                variacaoExibicao = undefined;
              }

              const multVal = Number(item.multiplicadorAplicado || (item as any).multiplicador || 1);
              const isRelampago =
                item.campanhaAplicada === true ||
                item.campanha_relampago_aplicada === 'sim' ||
                (item as any).eh_relampago === true ||
                (item as any).eh_relampago === 'sim' ||
                multVal > 1;

              return (
                <tr key={idx} className="text-slate-700">
                  <td className="py-3 print:py-1">
                    <div className="flex items-center flex-wrap gap-1.5 font-semibold">
                      <span>
                        {nomePrendaExibicao}
                        {variacaoExibicao ? ` — ${variacaoExibicao}` : ''}
                      </span>

                      {isRelampago && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-wider border border-amber-200 shrink-0 print:border-amber-400 print:text-amber-950">
                          ⚡ RELÂMPAGO {multVal}x
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3 text-center font-bold print:py-1">
                    {item.quantidade}
                  </td>

                  <td className="py-3 text-right text-slate-400 font-mono text-xs print:py-1 print:text-[10px]">
                    {item.pontuacaoBase}
                  </td>

                  <td className="py-3 text-center print:py-1">
                    {item.multiplicadorAplicado > 1 ? (
                      <span className="p-1 rounded bg-amber-100 text-amber-800 text-[9px] font-black uppercase print:py-0.5 print:px-1">
                        {item.multiplicadorAplicado}x
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs print:text-[10px]">1x</span>
                    )}
                  </td>

                  <td className="py-3 text-right font-black text-slate-900 print:py-1">
                    {formatPoints(item.subtotal)} pts
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="border-t-2 border-slate-800 font-extrabold text-base md:text-lg print:text-xs">
              <td colSpan={4} className="py-4 text-right print:py-1.5">
                Total Geral de Pontos:
              </td>
              <td className="py-4 text-right text-indigo-700 print:py-1.5">
                {formatPoints(recibo.total_pontos)} pts
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {recibo.observacao && (
        <div className="mb-6 p-4 bg-slate-50 border border-slate-250 rounded-2xl text-xs md:text-sm text-slate-700 italic print:mb-3 print:p-2.5 print:rounded-xl print:text-[10px]">
          <strong className="text-slate-900 not-italic font-bold">
            Observação geral:
          </strong>{' '}
          {recibo.observacao}
        </div>
      )}

      <div className="mt-12 flex flex-col sm:flex-row justify-between items-center sm:items-start gap-8 sm:gap-4 px-4 md:px-12 print:flex-row print:justify-between print:px-8 print:mt-6 print:gap-4">
        <div className="text-center w-64 border-t border-slate-800 pt-2 shrink-0 print:w-52 print:pt-1">
          <p className="text-xs md:text-sm font-bold text-slate-800 uppercase print:text-[10px]">
            RESPONSÁVEL PELO RECEBIMENTO
          </p>
          <p className="text-[10px] md:text-xs text-slate-500 uppercase font-semibold mt-0.5 print:text-[9px]">
            CTPM GAMELEIRA
          </p>
        </div>

        <div className="text-center w-64 border-t border-slate-800 pt-2 shrink-0 print:w-52 print:pt-1">
           <p className="text-xs md:text-sm font-bold text-slate-800 uppercase print:text-[10px]">
             Responsável pela entrega / Entregador
          </p>
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
        <div className="border-t-2 border-dashed border-slate-300 my-8 print:my-4 print:border-slate-800"></div>
        <ViaRecibo title="Via 2 - Responsável/Entregador" />
      </div>
    </div>
  );
}