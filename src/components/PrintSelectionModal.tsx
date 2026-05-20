import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Square, Printer, Eye, AlertCircle } from 'lucide-react';

interface PrintSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: 'RELATORIO' | 'RANKING';
  onAction: (selectedItems: string[], action: 'VIEW' | 'PRINT') => void;
}

export function PrintSelectionModal({ isOpen, onClose, reportType, onAction }: PrintSelectionModalProps) {
  const relatorioOptions = [
    { id: 'resumo_geral', label: 'Resumo geral do dia' },
    { id: 'total_pontos', label: 'Total de pontos do dia' },
    { id: 'total_recibos', label: 'Total de recibos emitidos' },
    { id: 'total_alunos', label: 'Total de alunos com lançamento' },
    { id: 'total_turmas', label: 'Total de turmas com lançamento' },
    { id: 'total_prendas', label: 'Total de prendas arrecadadas' },
    { id: 'pontuacao_turma', label: 'Pontuação por turma' },
    { id: 'lista_recibos', label: 'Lista de recibos emitidos' },
    { id: 'lista_alunos', label: 'Lista de alunos com lançamento' },
    { id: 'lista_prendas', label: 'Lista de prendas arrecadadas' },
    { id: 'campanhas_aplicadas', label: 'Campanhas relâmpago aplicadas' },
    { id: 'usuarios_responsaveis', label: 'Usuários responsáveis pelos lançamentos' },
    { id: 'observacoes_recibos', label: 'Observações dos recibos' },
  ];

  const rankingOptions = [
    { id: 'ranking_turmas', label: 'Ranking de turmas' },
    { id: 'ranking_serie', label: 'Ranking por ano/série' },
    { id: 'top_10_alunos', label: 'Top 10 alunos' },
    { id: 'resumo_turno', label: 'Resumo por turno' },
    { id: 'destaques', label: 'Destaques do dia: 1º, 2º e 3º lugar' },
    { id: 'total_pontos_turma', label: 'Total de pontos por turma' },
    { id: 'quantidade_recibos_turma', label: 'Quantidade de recibos por turma' },
    { id: 'data_turno_competicao', label: 'Data e turno da competição' },
    { id: 'obs_separacao_turnos', label: 'Observação informando que manhã e tarde competem separadamente' },
  ];

  const options = reportType === 'RELATORIO' ? relatorioOptions : rankingOptions;
  const [selectedItems, setSelectedItems] = useState<string[]>(options.map(o => o.id));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedItems(options.map(o => o.id));
    setError(null);
  }, [reportType, isOpen]);

  if (!isOpen) return null;

  const toggleAll = () => {
    if (selectedItems.length === options.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(options.map(o => o.id));
    }
  };

  const toggleItem = (id: string) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(item => item !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const handleAction = (action: 'VIEW' | 'PRINT') => {
    if (selectedItems.length === 0) {
      setError('Selecione pelo menos uma informação para imprimir.');
      return;
    }
    onAction(selectedItems, action);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="p-8 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Selecionar itens para impressão</h2>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Escolha quais informações deseja incluir no documento.</p>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <button 
            onClick={toggleAll}
            className="flex items-center gap-3 p-4 w-full bg-slate-50 rounded-2xl border border-slate-200 hover:bg-slate-100 transition-colors group"
          >
            {selectedItems.length === options.length ? (
              <CheckSquare className="w-6 h-6 text-indigo-600" />
            ) : (
              <Square className="w-6 h-6 text-slate-300 group-hover:text-slate-400" />
            )}
            <span className="font-black text-slate-900 uppercase text-xs tracking-widest">Selecionar todos</span>
          </button>

          <div className="grid grid-cols-1 gap-3">
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => toggleItem(option.id)}
                className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all text-left"
              >
                {selectedItems.includes(option.id) ? (
                  <CheckSquare className="w-5 h-5 text-indigo-600 shrink-0" />
                ) : (
                  <Square className="w-5 h-5 text-slate-300 shrink-0" />
                )}
                <span className={`text-sm font-bold ${selectedItems.includes(option.id) ? 'text-slate-900' : 'text-slate-500'}`}>
                  {option.label}
                </span>
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-rose-800 leading-tight">{error}</p>
            </div>
          )}
        </div>

        <div className="p-8 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-end gap-4 shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 font-black text-xs text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
          >
            Cancelar
          </button>
          <div className="flex w-full sm:w-auto gap-3">
            <button
              onClick={() => handleAction('VIEW')}
              className="flex-1 sm:flex-none flex items-center justify-center px-6 py-3 bg-white border-2 border-indigo-100 text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 hover:border-indigo-200 transition-all active:scale-95"
            >
              <Eye className="w-4 h-4 mr-2" />
              Visualizar
            </button>
            <button
              onClick={() => handleAction('PRINT')}
              className="flex-1 sm:flex-none flex items-center justify-center px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
