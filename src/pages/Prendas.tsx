import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Search, Gift, Tag, Plus, X, Loader2, AlertTriangle, CheckCircle, Pencil } from 'lucide-react';
import { formatPoints } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

interface Prenda {
  id: string;
  nome_prenda: string;
  categoria?: string;
  variacao?: string;
  pontuacao_base: number;
  status: string;
  observacao?: string;
}

const CATEGORIAS_PREDEFINIDAS = [
  'Brinquedo',
  'Material escolar',
  'Acessório',
  'Higiene/Limpeza',
  'Alimentação',
  'Bebidas não alcoólicas',
  'Outros'
];

export function Prendas() {
  const { profile } = useAuth();
  const [prendas, setPrendas] = useState<Prenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Novas prendas form state
  const [modalOpen, setModalOpen] = useState(false);
  const [nomeForm, setNomeForm] = useState('');
  const [categoriaForm, setCategoriaForm] = useState(CATEGORIAS_PREDEFINIDAS[0]);
  const [customCategoriaForm, setCustomCategoriaForm] = useState('');
  const [variacaoForm, setVariacaoForm] = useState('');
  const [pontuacaoForm, setPontuacaoForm] = useState('');
  const [observacaoForm, setObservacaoForm] = useState('');
  const [statusForm, setStatusForm] = useState<'ativo' | 'inativo'>('ativo');

  // Estados para Edição de Prenda
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPrenda, setSelectedPrenda] = useState<Prenda | null>(null);
  const [editNomeForm, setEditNomeForm] = useState('');
  const [editCategoriaForm, setEditCategoriaForm] = useState('');
  const [editCustomCategoriaForm, setEditCustomCategoriaForm] = useState('');
  const [editVariacaoForm, setEditVariacaoForm] = useState('');
  const [editPontuacaoForm, setEditPontuacaoForm] = useState('');
  const [editObservacaoForm, setEditObservacaoForm] = useState('');
  const [editStatusForm, setEditStatusForm] = useState<'ativo' | 'inativo'>('ativo');
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const [editModalSuccess, setEditModalSuccess] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Permissões
  const canCreate = profile?.perfil === 'admin' || profile?.pode_cadastrar_prendas === true;
  const isAdmin = profile?.perfil === 'admin';

  useEffect(() => {
    fetchPrendas();
  }, []);

  const fetchPrendas = async () => {
    setLoading(true);
    try {
      // Buscamos todas as prendas para fazer validação de duplicados inclusiva
      const { data, error } = await supabase
        .from('prendas')
        .select('*')
        .order('nome_prenda', { ascending: true });

      if (error) throw error;
      setPrendas(data || []);
    } catch (err) {
      console.error('Erro ao buscar prendas:', err);
    } finally {
      setLoading(false);
    }
  };

  const visiblePrendas = isAdmin ? prendas : prendas.filter(p => p.status === 'ativo');

  const filteredPrendas = visiblePrendas.filter(p => 
    p.nome_prenda.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.variacao && p.variacao.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.categoria && p.categoria.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const resetForm = () => {
    setNomeForm('');
    setCategoriaForm(CATEGORIAS_PREDEFINIDAS[0]);
    setCustomCategoriaForm('');
    setVariacaoForm('');
    setPontuacaoForm('');
    setObservacaoForm('');
    setStatusForm('ativo');
    setModalError(null);
    setModalSuccess(null);
  };

  const handleOpenModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleSalvarPrenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) {
      setModalError('Seu perfil não tem permissão para cadastrar prendas.');
      return;
    }

    setModalError(null);
    setModalSuccess(null);

    // Validações obrigatórias
    const nomeTrim = nomeForm.trim();
    if (!nomeTrim) {
      setModalError('O nome da prenda é obrigatório.');
      return;
    }

    const finalCategoria = (categoriaForm === 'Outros' ? customCategoriaForm.trim() : categoriaForm.trim());
    if (!finalCategoria) {
      setModalError('A categoria é obrigatória.');
      return;
    }

    const pontosNum = Number(pontuacaoForm);
    if (isNaN(pontosNum) || pontosNum <= 0) {
      setModalError('A pontuação base deve ser um número maior que zero.');
      return;
    }

    // Impedir cadastro duplicado exato de nome + variação
    const varTrim = variacaoForm.trim();
    const existeDuplicado = prendas.some(p => 
      p.nome_prenda.toLowerCase().trim() === nomeTrim.toLowerCase() &&
      (p.variacao || '').toLowerCase().trim() === varTrim.toLowerCase()
    );

    if (existeDuplicado) {
      setModalError('Uma prenda com este mesmo nome e variação já está cadastrada no sistema.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nome_prenda: nomeTrim,
        categoria: finalCategoria,
        variacao: varTrim || null,
        pontuacao_base: pontosNum,
        status: statusForm,
        observacao: observacaoForm.trim() || null,
        criado_em: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('prendas')
        .insert([payload])
        .select();

      if (error) throw error;

      setModalSuccess('Prenda cadastrada com sucesso.');
      
      // Atualiza automaticamente sem recarregar a sessão
      if (data && data[0]) {
        setPrendas(prev => [...prev, data[0]].sort((a, b) => a.nome_prenda.localeCompare(b.nome_prenda)));
      } else {
        await fetchPrendas();
      }

      setTimeout(() => {
        setModalOpen(false);
        resetForm();
      }, 1500);

    } catch (err: any) {
      console.error('Erro ao inserir nova prenda:', err);
      setModalError('Não foi possível cadastrar a prenda. Verifique os dados e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEditModal = (prenda: Prenda) => {
    setSelectedPrenda(prenda);
    setEditNomeForm(prenda.nome_prenda);
    
    if (CATEGORIAS_PREDEFINIDAS.includes(prenda.categoria || '')) {
      setEditCategoriaForm(prenda.categoria || '');
      setEditCustomCategoriaForm('');
    } else {
      setEditCategoriaForm('Outros');
      setEditCustomCategoriaForm(prenda.categoria || '');
    }
    
    setEditVariacaoForm(prenda.variacao || '');
    setEditPontuacaoForm(String(prenda.pontuacao_base));
    setEditObservacaoForm(prenda.observacao || '');
    setEditStatusForm((prenda.status || 'ativo') as 'ativo' | 'inativo');
    
    setEditModalError(null);
    setEditModalSuccess(null);
    setEditModalOpen(true);
  };

  const handleEditarPrenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setEditModalError('Seu perfil não tem permissão para editar prendas.');
      return;
    }
    if (!selectedPrenda) return;

    setEditModalError(null);
    setEditModalSuccess(null);

    // Validações obrigatórias
    const nomeTrim = editNomeForm.trim();
    if (!nomeTrim) {
      setEditModalError('O nome da prenda é obrigatório.');
      return;
    }

    const finalCategoria = (editCategoriaForm === 'Outros' ? editCustomCategoriaForm.trim() : editCategoriaForm.trim());
    if (!finalCategoria) {
      setEditModalError('A categoria é obrigatória.');
      return;
    }

    const pontosNum = Number(editPontuacaoForm);
    if (isNaN(pontosNum) || pontosNum <= 0) {
      setEditModalError('A pontuação base deve ser um número maior que zero.');
      return;
    }

    // Impedir cadastro duplicado de nome + variação se alterado (excluindo a própria prenda sendo editada)
    const varTrim = editVariacaoForm.trim();
    const existeDuplicado = prendas.some(p => 
      p.id !== selectedPrenda.id &&
      p.nome_prenda.toLowerCase().trim() === nomeTrim.toLowerCase() &&
      (p.variacao || '').toLowerCase().trim() === varTrim.toLowerCase()
    );

    if (existeDuplicado) {
      setEditModalError('Uma outra prenda com este mesmo nome e variação já está cadastrada no sistema.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nome_prenda: nomeTrim,
        categoria: finalCategoria,
        variacao: varTrim || null,
        pontuacao_base: pontosNum,
        status: editStatusForm,
        observacao: editObservacaoForm.trim() || null
      };

      const { data, error } = await supabase
        .from('prendas')
        .update(payload)
        .eq('id', selectedPrenda.id)
        .select();

      if (error) throw error;

      setEditModalSuccess('Prenda atualizada com sucesso.');

      // Atualiza localmente sem recarregar tudo
      if (data && data[0]) {
        setPrendas(prev => prev.map(p => p.id === selectedPrenda.id ? data[0] : p).sort((a, b) => a.nome_prenda.localeCompare(b.nome_prenda)));
      } else {
        await fetchPrendas();
      }

      setTimeout(() => {
        setEditModalOpen(false);
        setSelectedPrenda(null);
      }, 1500);

    } catch (err: any) {
      console.error('Erro ao editar prenda:', err);
      setEditModalError('Não foi possível atualizar a prenda. Verifique os dados e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Prendas</h1>
          <p className="text-slate-500">Lista de prendas ativas e suas pontuações base.</p>
        </div>
        
        {canCreate && (
          <button
            onClick={handleOpenModal}
            className="flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Cadastrar Nova Prenda
          </button>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome ou categoria..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-800 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-8 text-center text-slate-400 uppercase text-xs tracking-widest font-bold flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
              Carregando prendas...
            </div>
          ) : filteredPrendas.length > 0 ? (
            filteredPrendas.map((prenda) => (
              <div key={prenda.id} className="relative p-4 bg-slate-50 hover:bg-slate-100/50 transition-colors rounded-xl border border-slate-100 flex items-start gap-4">
                <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 text-slate-900">
                  <Gift className="w-6 h-6 text-slate-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-slate-900 leading-tight mb-0.5 truncate flex-1">{prenda.nome_prenda}</h3>
                    {isAdmin && (
                      <button
                        onClick={() => handleOpenEditModal(prenda)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Editar Prenda"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {prenda.variacao && (
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1 truncate">{prenda.variacao}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {prenda.categoria && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium whitespace-nowrap">
                        <Tag className="w-3 h-3" />
                        {prenda.categoria}
                      </div>
                    )}
                    {prenda.status === 'inativo' && (
                      <span className="inline-block text-[8px] font-black uppercase tracking-wider text-red-700 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded shrink-0 leading-none">
                        Inativo
                      </span>
                    )}
                  </div>
                  <div className="text-slate-900 font-bold bg-white inline-block px-2 py-0.5 rounded border border-slate-200 shadow-sm text-sm">
                    {formatPoints(prenda.pontuacao_base)} pts
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-8 text-center text-slate-400 font-medium font-sans">
              Nenhuma prenda encontrada.
            </div>
          )}
        </div>
      </div>

      {/* Modal de Cadastro de Prenda */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !saving && setModalOpen(false)}
          />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col p-6 text-slate-800 text-left">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <Gift className="h-5 w-5 text-indigo-600" />
                Cadastrar Nova Prenda
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarPrenda} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Nome da Prenda *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Refrigerante 2L, Caixa de Bombom"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm focus:bg-white outline-none transition-all text-slate-800 font-bold"
                  value={nomeForm}
                  onChange={(e) => setNomeForm(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Categoria *
                  </label>
                  <select
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm focus:bg-white outline-none transition-all text-slate-800 font-bold cursor-pointer"
                    value={categoriaForm}
                    onChange={(e) => setCategoriaForm(e.target.value)}
                    disabled={saving}
                  >
                    {CATEGORIAS_PREDEFINIDAS.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Variação / Descrição Opcional
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Lata, Garrafa, Pacote"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm focus:bg-white outline-none transition-all text-slate-800 font-bold"
                    value={variacaoForm}
                    onChange={(e) => setVariacaoForm(e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              {categoriaForm === 'Outros' && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Especifique a Categoria *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Digite a nova categoria..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm focus:bg-white outline-none transition-all text-slate-800 font-bold"
                    value={customCategoriaForm}
                    onChange={(e) => setCustomCategoriaForm(e.target.value)}
                    disabled={saving}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Pontuação Base *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Pontos ganhos"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm focus:bg-white outline-none transition-all text-slate-800 font-bold"
                    value={pontuacaoForm}
                    onChange={(e) => setPontuacaoForm(e.target.value)}
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Status da Prenda *
                  </label>
                  <select
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm focus:bg-white outline-none transition-all text-slate-800 font-bold cursor-pointer"
                    value={statusForm}
                    onChange={(e) => setStatusForm(e.target.value as 'ativo' | 'inativo')}
                    disabled={saving}
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Observações de Registro Opcional
                </label>
                <textarea
                  placeholder="Alguma anotação sobre a arrecadação desta prenda..."
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm focus:bg-white outline-none transition-all text-slate-800 font-semibold"
                  value={observacaoForm}
                  onChange={(e) => setObservacaoForm(e.target.value)}
                  disabled={saving}
                />
              </div>

              {modalError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-bold leading-tight uppercase tracking-wider">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {modalSuccess && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold leading-tight uppercase tracking-wider">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{modalSuccess}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin text-white" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Prenda'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Prenda */}
      {editModalOpen && selectedPrenda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !saving && setEditModalOpen(false)}
          />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col p-6 text-slate-800 text-left">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <Gift className="h-5 w-5 text-indigo-600" />
                Editar Prenda
              </h3>
              <button 
                onClick={() => setEditModalOpen(false)}
                disabled={saving}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditarPrenda} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Nome da Prenda *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Refrigerante 2L, Caixa de Bombom"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm focus:bg-white outline-none transition-all text-slate-800 font-bold"
                  value={editNomeForm}
                  onChange={(e) => setEditNomeForm(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Categoria *
                  </label>
                  <select
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm focus:bg-white outline-none transition-all text-slate-800 font-bold cursor-pointer"
                    value={editCategoriaForm}
                    onChange={(e) => setEditCategoriaForm(e.target.value)}
                    disabled={saving}
                  >
                    {CATEGORIAS_PREDEFINIDAS.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Variação / Descrição Opcional
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Lata, Garrafa, Pacote"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm focus:bg-white outline-none transition-all text-slate-800 font-bold"
                    value={editVariacaoForm}
                    onChange={(e) => setEditVariacaoForm(e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              {editCategoriaForm === 'Outros' && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Especifique a Categoria *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Digite a nova categoria..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm focus:bg-white outline-none transition-all text-slate-800 font-bold"
                    value={editCustomCategoriaForm}
                    onChange={(e) => setEditCustomCategoriaForm(e.target.value)}
                    disabled={saving}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Pontuação Base *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Pontos ganhos"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm focus:bg-white outline-none transition-all text-slate-800 font-bold"
                    value={editPontuacaoForm}
                    onChange={(e) => setEditPontuacaoForm(e.target.value)}
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Status da Prenda *
                  </label>
                  <select
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm focus:bg-white outline-none transition-all text-slate-800 font-bold cursor-pointer"
                    value={editStatusForm}
                    onChange={(e) => setEditStatusForm(e.target.value as 'ativo' | 'inativo')}
                    disabled={saving}
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Observações de Registro Opcional
                </label>
                <textarea
                  placeholder="Alguma anotação sobre a arrecadação desta prenda..."
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-sm focus:bg-white outline-none transition-all text-slate-800 font-semibold"
                  value={editObservacaoForm}
                  onChange={(e) => setEditObservacaoForm(e.target.value)}
                  disabled={saving}
                />
              </div>

              {editModalError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-bold leading-tight uppercase tracking-wider">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                  <span>{editModalError}</span>
                </div>
              )}

              {editModalSuccess && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold leading-tight uppercase tracking-wider">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{editModalSuccess}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin text-white" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar alterações'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
