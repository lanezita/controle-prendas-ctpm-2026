import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { 
  Zap, 
  Plus, 
  X, 
  Save, 
  Loader2, 
  Calendar, 
  Clock, 
  Tag, 
  ChevronRight,
  AlertCircle,
  Edit2,
  Trash2,
  Archive,
  Ban,
  Gift,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';

const CATEGORIAS_PREDEFINIDAS = [
  'Brinquedo',
  'Material escolar',
  'Acessório',
  'Higiene/Limpeza',
  'Alimentação',
  'Bebidas não alcoólicas',
  'Outros'
];
import { isCampanhaVigente, getLocalDataFmt } from '../lib/mock-data';

interface Campanha {
  id: string;
  nome_campanha: string;
  prenda_id: string;
  multiplicador: number;
  data_inicio: string;
  data_fim: string;
  turno_aplicacao: string;
  status: string;
  observacao?: string;
  criado_em: string;
  prendas?: {
    nome_prenda: string;
    variacao?: string;
    pontuacao_base: number;
  };
}

interface Prenda {
  id: string;
  nome_prenda: string;
  variacao?: string;
  pontuacao_base: number;
}

export function Campanhas() {
  const { user, profile } = useAuth();
  
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [loading, setLoading] = useState(true);
  const [prendas, setPrendas] = useState<Prenda[]>([]);
  const [loadingPrendas, setLoadingPrendas] = useState(false);
  const [errorPrendas, setErrorPrendas] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampanha, setEditingCampanha] = useState<Campanha | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    console.log('Usuário logado:', user);
    console.log('Perfil carregado:', profile);
  }, [user, profile]);

  // Form states
  const [nome, setNome] = useState('');
  const [prendaId, setPrendaId] = useState('');
  const [multiplicador, setMultiplicador] = useState(2);
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  const [turno, setTurno] = useState<'manha' | 'tarde' | 'ambos'>('manha');
  const [status, setStatus] = useState('ativa');
  const [observacao, setObservacao] = useState('');

  // Quick Prenda modal states
  const [quickPrendaModalOpen, setQuickPrendaModalOpen] = useState(false);
  const [qpNome, setQpNome] = useState('');
  const [qpCategoria, setQpCategoria] = useState(CATEGORIAS_PREDEFINIDAS[0]);
  const [qpCustomCategoria, setQpCustomCategoria] = useState('');
  const [qpVariacao, setQpVariacao] = useState('');
  const [qpPontuacao, setQpPontuacao] = useState('');
  const [qpObservacao, setQpObservacao] = useState('');
  const [qpSaving, setQpSaving] = useState(false);
  const [qpError, setQpError] = useState<string | null>(null);
  const [qpSuccess, setQpSuccess] = useState<string | null>(null);

  const canCreatePrenda = profile?.perfil === 'admin' || profile?.pode_cadastrar_prendas === true;

  const canCreate = profile?.perfil === 'admin' || profile?.pode_cadastrar_campanhas;

  useEffect(() => {
    fetchCampanhas();
    if (canCreate || isModalOpen) {
      fetchPrendas();
    }
    
    // Set default shift if not admin
    if (profile?.perfil === 'manha' || profile?.perfil === 'tarde') {
      setTurno(profile.perfil);
    }
  }, [profile, canCreate]);

  const fetchCampanhas = async () => {
    setLoading(true);
    try {
      console.log('Carregando campanhas relâmpago de todos os turnos permitidos...');
      let query = supabase
        .from('campanhas_relampago')
        .select(`
          *,
          prendas (
            nome_prenda,
            variacao,
            pontuacao_base
          )
        `);

      // Se não for admin, filtrar por turno (próprio ou ambos)
      if (profile && profile.perfil !== 'admin') {
        query = query.or(`turno_aplicacao.eq.ambos,turno_aplicacao.eq.${profile.perfil}`);
      }

      const { data, error } = await query.order('data_inicio', { ascending: false });

      if (error) throw error;
      setCampanhas(data || []);
    } catch (err) {
      console.error('Erro ao buscar campanhas:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrendas = async () => {
    console.log('Carregando prendas para campanhas...');
    setLoadingPrendas(true);
    setErrorPrendas(null);
    try {
      const { data, error } = await supabase
        .from('prendas')
        .select('id, nome_prenda, categoria, variacao, pontuacao_base, status')
        .eq('status', 'ativo')
        .order('nome_prenda', { ascending: true });

      console.log('Prendas carregadas para campanhas:', data);
      if (error) {
        console.error('Erro ao carregar prendas para campanhas:', error);
        setErrorPrendas('Erro ao carregar prendas. Verifique a conexão com o Supabase.');
        return;
      }
      
      setPrendas(data || []);
      if (!data || data.length === 0) {
        setErrorPrendas('Nenhuma prenda ativa cadastrada.');
      }
    } catch (err) {
      console.error('Erro ao buscar prendas:', err);
      setErrorPrendas('Erro ao carregar prendas. Verifique a conexão com o Supabase.');
    } finally {
      setLoadingPrendas(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !canCreate) return;

    if (!nome.trim() || !prendaId || multiplicador <= 1 || !dataInicio || !dataFim || !turno) {
      alert('Preencha todos os campos obrigatórios corretamente.');
      return;
    }

    if (dataFim < dataInicio) {
      alert('A data de fim não pode ser anterior à data de início.');
      return;
    }

    // Role check for shift
    if (profile.perfil !== 'admin' && turno !== profile.perfil) {
      alert('Você só pode cadastrar campanhas para o seu próprio turno.');
      return;
    }

    // Permission check for editing
    if (editingCampanha && profile.perfil !== 'admin') {
      if (editingCampanha.turno_aplicacao === 'ambos') {
        alert('Apenas administradores podem editar campanhas aplicadas a ambos os turnos.');
        return;
      }
      if (editingCampanha.turno_aplicacao !== profile.perfil) {
        alert('Você não tem permissão para editar campanhas de outro turno.');
        return;
      }
    }

    const payload = {
      nome_campanha: nome,
      prenda_id: prendaId,
      multiplicador,
      data_inicio: dataInicio,
      data_fim: dataFim,
      turno_aplicacao: turno,
      status,
      observacao,
      // criado_por excluded during update if using upsert or manual check
    };

    console.log('Payload campanha:', payload);
    setIsSubmitting(true);
    try {
      if (editingCampanha) {
        const { error } = await supabase
          .from('campanhas_relampago')
          .update(payload)
          .eq('id', editingCampanha.id);

        if (error) throw error;
        alert('Campanha atualizada com sucesso.');
      } else {
        const { error } = await supabase
          .from('campanhas_relampago')
          .insert([{ ...payload, criado_por: profile.id }]);

        if (error) {
          if (error.code === '42501') {
            alert('Permissão negada pelo Supabase. Verifique o perfil e as permissões do usuário.');
          } else {
            throw error;
          }
          return;
        }
      }

      setIsModalOpen(false);
      setEditingCampanha(null);
      resetForm();
      fetchCampanhas();
    } catch (err) {
      console.error('Erro ao salvar campanha:', err);
      alert('Erro ao salvar campanha. Verifique os logs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (campanha: Campanha) => {
    // Permission check
    if (profile?.perfil !== 'admin') {
      if (campanha.turno_aplicacao === 'ambos' || campanha.turno_aplicacao !== profile?.perfil) {
        alert('Você não tem permissão para editar esta campanha.');
        return;
      }
    }

    setEditingCampanha(campanha);
    setNome(campanha.nome_campanha);
    setPrendaId(campanha.prenda_id);
    setMultiplicador(campanha.multiplicador);
    setDataInicio(campanha.data_inicio);
    setDataFim(campanha.data_fim);
    setTurno(campanha.turno_aplicacao as any);
    setStatus(campanha.status);
    setObservacao(campanha.observacao || '');
    setIsModalOpen(true);
  };

  const handleStatusUpdate = async (campanha: Campanha, newStatus: string) => {
    // Permission check
    if (profile?.perfil !== 'admin') {
      if (campanha.turno_aplicacao === 'ambos' || campanha.turno_aplicacao !== profile?.perfil) {
        alert('Você não tem permissão para alterar esta campanha.');
        return;
      }
    }

    const actionLabel = newStatus === 'cancelada' ? 'cancelar' : 'encerrar';
    if (!confirm(`Tem certeza que deseja ${actionLabel} esta campanha?`)) return;

    try {
      const { error } = await supabase
        .from('campanhas_relampago')
        .update({ status: newStatus })
        .eq('id', campanha.id);

      if (error) throw error;
      alert(`Campanha ${newStatus === 'cancelada' ? 'cancelada' : 'encerrada'} com sucesso.`);
      fetchCampanhas();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      alert('Erro ao atualizar status da campanha.');
    }
  };

  const handleDelete = async (campanha: Campanha) => {
    if (profile?.perfil !== 'admin') {
      alert('Apenas administradores podem excluir campanhas.');
      return;
    }

    if (!confirm('Tem certeza que deseja excluir esta campanha? Esta ação não poderá ser desfeita.')) return;

    try {
      // Check for usage in recibo_itens
      const { data: uso, error: useError } = await supabase
        .from('recibo_itens')
        .select('id')
        .eq('campanha_relampago_id', campanha.id)
        .limit(1);

      if (useError) throw useError;

      if (uso && uso.length > 0) {
        alert('Esta campanha já foi usada em recibos. Para manter o histórico, ela será marcada como cancelada.');
        const { error: cancelError } = await supabase
          .from('campanhas_relampago')
          .update({ status: 'cancelada' })
          .eq('id', campanha.id);
        
        if (cancelError) throw cancelError;
        alert('Campanha marcada como cancelada.');
      } else {
        const { error } = await supabase
          .from('campanhas_relampago')
          .delete()
          .eq('id', campanha.id);

        if (error) throw error;
        alert('Campanha excluída com sucesso.');
      }
      fetchCampanhas();
    } catch (err) {
      console.error('Erro ao excluir campanha:', err);
      alert('Erro ao excluir campanha.');
    }
  };

  const resetForm = () => {
    setNome('');
    setPrendaId('');
    setMultiplicador(2);
    setDataInicio(new Date().toISOString().split('T')[0]);
    setDataFim(new Date().toISOString().split('T')[0]);
    setTurno(profile?.perfil === 'admin' ? 'manha' : (profile?.perfil || 'manha') as any);
    setStatus('ativa');
    setObservacao('');
  };

  const handleSalvarQuickPrenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreatePrenda) {
      setQpError('Seu perfil não tem permissão para cadastrar prendas.');
      return;
    }

    setQpError(null);
    setQpSuccess(null);

    const nomeTrim = qpNome.trim();
    if (!nomeTrim) {
      setQpError('O nome da prenda é obrigatório.');
      return;
    }

    const finalCategoria = qpCategoria === 'Outros' ? qpCustomCategoria.trim() : qpCategoria.trim();
    if (!finalCategoria) {
      setQpError('A categoria é obrigatória.');
      return;
    }

    const pontosNum = Number(qpPontuacao);
    if (isNaN(pontosNum) || pontosNum <= 0) {
      setQpError('A pontuação base deve ser maior que zero.');
      return;
    }

    // Duplicate check
    const existeDuplicado = prendas.some(p => 
      p.nome_prenda.toLowerCase().trim() === nomeTrim.toLowerCase() &&
      (p.variacao || '').toLowerCase().trim() === qpVariacao.trim().toLowerCase()
    );

    if (existeDuplicado) {
      setQpError('Uma prenda com este mesmo nome e variação já existe no sistema.');
      return;
    }

    setQpSaving(true);
    try {
      const payload = {
        nome_prenda: nomeTrim,
        categoria: finalCategoria,
        variacao: qpVariacao.trim() || null,
        pontuacao_base: pontosNum,
        status: 'ativo',
        observacao: qpObservacao.trim() || null,
        criado_em: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('prendas')
        .insert([payload])
        .select();

      if (error) throw error;

      setQpSuccess('Prenda cadastrada com sucesso.');
      
      // Reload prendas to include the new one
      await fetchPrendas();

      if (data && data[0]) {
        setPrendaId(data[0].id);
      }

      setTimeout(() => {
        setQuickPrendaModalOpen(false);
      }, 1500);

    } catch (err) {
      console.error('Erro ao cadastrar prenda rápida:', err);
      setQpError('Não foi possível cadastrar a prenda.');
    } finally {
      setQpSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center">
            <Zap className="w-8 h-8 mr-3 text-amber-500 fill-amber-500" />
            Campanhas Relâmpago
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Gestão de multiplicadores temporários de pontuação
          </p>
        </div>
        
        {canCreate && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-100 active:scale-95"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Campanha
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Carregando campanhas...</p>
        </div>
      ) : campanhas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dotted border-slate-300">
          <Zap className="w-12 h-12 text-slate-200 mb-4" />
          <p className="text-slate-400 font-bold">Nenhuma campanha cadastrada no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campanhas.map((campanha) => (
            <div key={campanha.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden flex flex-col">
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  {(() => {
                    const isVigente = isCampanhaVigente(campanha);
                    if (campanha.status === 'ativa') {
                      if (isVigente) {
                        return (
                          <div className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-800">
                            Ativa
                          </div>
                        );
                      } else {
                        return (
                          <div className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-800">
                            Expirada
                          </div>
                        );
                      }
                    } else if (campanha.status === 'encerrada') {
                      return (
                        <div className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-800">
                          Encerrada
                        </div>
                      );
                    } else {
                      return (
                        <div className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-rose-100 text-rose-800">
                          {campanha.status}
                        </div>
                      );
                    }
                  })()}
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Multiplicador</span>
                    <span className="text-2xl font-black text-indigo-600 tracking-tighter">
                      {campanha.multiplicador}x
                    </span>
                  </div>
                </div>

                <h3 className="text-lg font-black text-slate-900 leading-tight mb-4 group-hover:text-indigo-600 transition-colors">
                  {campanha.nome_campanha}
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <Tag className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Prenda Vinculada</span>
                      <span className="font-bold text-slate-700 leading-tight">
                        {campanha.prendas?.nome_prenda} {campanha.prendas?.variacao && <span className="font-medium text-slate-400">— {campanha.prendas.variacao}</span>}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center text-sm">
                    <Calendar className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Vigência</span>
                      <span className="font-bold text-slate-700">
                        {format(new Date(campanha.data_inicio + 'T12:00:00Z'), 'dd/MM/yy')} a {format(new Date(campanha.data_fim + 'T12:00:00Z'), 'dd/MM/yy')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center text-sm">
                    <Clock className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Turno</span>
                      <span className={`font-black text-[10px] uppercase tracking-widest mt-0.5 ${
                        campanha.turno_aplicacao === 'manha' ? 'text-amber-600' : 
                        campanha.turno_aplicacao === 'tarde' ? 'text-blue-600' : 'text-indigo-600'
                      }`}>
                        {campanha.turno_aplicacao === 'ambos' ? 'Manhã e Tarde' : campanha.turno_aplicacao === 'manha' ? 'Somente Manhã' : 'Somente Tarde'}
                      </span>
                    </div>
                  </div>
                </div>

                {campanha.observacao && (
                  <div className="mt-4 pt-4 border-t border-slate-50 italic text-slate-400 text-xs">
                    "{campanha.observacao}"
                  </div>
                )}
              </div>
              
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-3">
                 <div className="flex justify-between items-center">
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                     Criada em {format(new Date(campanha.criado_em), 'dd/MM/yyyy')}
                   </span>
                   <ChevronRight className="w-4 h-4 text-slate-300" />
                 </div>

                 {/* Ações */}
                 {(profile?.perfil === 'admin' || (profile?.pode_cadastrar_campanhas && (campanha.turno_aplicacao === profile.perfil))) && (
                   <div className="flex items-center gap-2 pt-2 border-t border-slate-100/50">
                     <button
                       onClick={() => handleEdit(campanha)}
                       className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-indigo-600 border border-transparent hover:border-slate-200"
                       title="Editar"
                     >
                       <Edit2 className="w-3.5 h-3.5" />
                     </button>
                     {campanha.status === 'ativa' && (
                       <>
                         <button
                           onClick={() => handleStatusUpdate(campanha, 'encerrada')}
                           className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-emerald-600 border border-transparent hover:border-slate-200"
                           title="Encerrar"
                         >
                           <Archive className="w-3.5 h-3.5" />
                         </button>
                         <button
                           onClick={() => handleStatusUpdate(campanha, 'cancelada')}
                           className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-rose-600 border border-transparent hover:border-slate-200"
                           title="Cancelar"
                         >
                           <Ban className="w-3.5 h-3.5" />
                         </button>
                       </>
                     )}
                     {profile?.perfil === 'admin' && (
                       <button
                         onClick={() => handleDelete(campanha)}
                         className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-red-600 border border-transparent hover:border-slate-200 ml-auto"
                         title="Excluir"
                       >
                         <Trash2 className="w-3.5 h-3.5" />
                       </button>
                     )}
                   </div>
                 )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            onClick={() => !isSubmitting && setIsModalOpen(false)}
          />
          
          <div className="relative bg-white w-full max-w-lg rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header Fixo */}
            <div className="p-6 md:p-8 border-b border-slate-100 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {editingCampanha ? 'Editar Campanha' : 'Nova Campanha'}
                  </h2>
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">
                    {editingCampanha ? 'Atualize os detalhes' : 'Preencha os detalhes'}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingCampanha(null);
                    resetForm();
                  }}
                  className="p-3 hover:bg-slate-100 rounded-2xl transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Conteúdo Rolável */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1">
              <form id="campanhas-form" onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome da Campanha *</label>
                  <input 
                    type="text"
                    required
                    className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="Ex: Semana da Amoeba"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <div className="flex justify-between items-center mb-1.5 ml-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Prenda Vinculada *</label>
                      {canCreatePrenda && (
                        <button
                          type="button"
                          onClick={() => {
                            setQpNome('');
                            setQpCategoria(CATEGORIAS_PREDEFINIDAS[0]);
                            setQpCustomCategoria('');
                            setQpVariacao('');
                            setQpPontuacao('');
                            setQpObservacao('');
                            setQpError(null);
                            setQpSuccess(null);
                            setQuickPrendaModalOpen(true);
                          }}
                          className="text-[10px] font-black uppercase text-indigo-600 hover:text-slate-950 transition-colors cursor-pointer"
                        >
                          + Cadastrar nova prenda
                        </button>
                      )}
                    </div>
                    <select 
                      required
                      className={`w-full h-12 bg-slate-50 border-none rounded-2xl px-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all ${errorPrendas ? 'ring-2 ring-red-500' : ''}`}
                      value={prendaId}
                      onChange={e => setPrendaId(e.target.value)}
                      disabled={loadingPrendas}
                    >
                      <option value="">{loadingPrendas ? 'Carregando prendas...' : errorPrendas || 'Selecione uma prenda...'}</option>
                      {prendas.map(p => {
                        const label = p.variacao 
                          ? `${p.nome_prenda} — ${p.variacao} — ${p.pontuacao_base} pts`
                          : `${p.nome_prenda} — ${p.pontuacao_base} pts`;
                        return (
                          <option key={p.id} value={p.id}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                    {errorPrendas && (
                      <p className="mt-1 text-[10px] font-bold text-red-600 ml-1">{errorPrendas}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Multiplicador *</label>
                    <input 
                      type="number"
                      step="0.1"
                      min="1.1"
                      required
                      className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                      value={multiplicador}
                      onChange={e => setMultiplicador(parseFloat(e.target.value))}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Turno de Aplicação *</label>
                    <select 
                      required
                      className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-60"
                      value={turno}
                      onChange={e => setTurno(e.target.value as any)}
                      disabled={profile?.perfil !== 'admin'}
                    >
                      {profile?.perfil === 'admin' && <option value="ambos">Ambos</option>}
                      {(profile?.perfil === 'admin' || profile?.perfil === 'manha') && <option value="manha">Manhã</option>}
                      {(profile?.perfil === 'admin' || profile?.perfil === 'tarde') && <option value="tarde">Tarde</option>}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Status *</label>
                    <select 
                      required
                      className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all"
                      value={status}
                      onChange={e => setStatus(e.target.value)}
                    >
                      <option value="ativa">Ativa</option>
                      <option value="encerrada">Encerrada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Data Início *</label>
                    <input 
                      type="date"
                      required
                      className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all"
                      value={dataInicio}
                      onChange={e => setDataInicio(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Data Fim *</label>
                    <input 
                      type="date"
                      required
                      className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all"
                      value={dataFim}
                      onChange={e => setDataFim(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Observação</label>
                  <textarea 
                    className="w-full h-24 bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                    placeholder="Ex: Campanha válida para todas as turmas..."
                    value={observacao}
                    onChange={e => setObservacao(e.target.value)}
                  />
                </div>
              </form>
            </div>

            {/* Rodapé Fixo */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
              <div className="flex items-center text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-3 py-2 rounded-xl mr-auto justify-center sm:justify-start">
                <AlertCircle className="w-3 h-3 mr-1.5 shrink-0" />
                Campos com * são obrigatórios
              </div>
              <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-6 py-3 font-black text-xs text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors w-full sm:w-auto"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="campanhas-form"
                  disabled={isSubmitting}
                  className="flex items-center justify-center px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 whitespace-nowrap w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" />
                  ) : (
                    <Save className="w-4 h-4 mr-2 shrink-0" />
                  )}
                  {editingCampanha ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rápido de Cadastro de Prenda */}
      {quickPrendaModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 select-none">
          <div 
            className="absolute inset-0 bg-slate-900/65 backdrop-blur-xs"
            onClick={() => !qpSaving && setQuickPrendaModalOpen(false)}
          />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col p-6 text-slate-850 text-left">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5 uppercase">
                <Gift className="h-5 w-5 text-indigo-600" />
                Cadastrar Prenda Rápido
              </h3>
              <button 
                type="button"
                onClick={() => setQuickPrendaModalOpen(false)}
                disabled={qpSaving}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors cursor-pointer animate-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarQuickPrenda} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Nome da Prenda *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Refrigerante 2L, Suco de Caixinha"
                  className="w-full h-11 bg-slate-100/50 border border-slate-200 rounded-xl px-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all font-sans"
                  value={qpNome}
                  onChange={(e) => setQpNome(e.target.value)}
                  disabled={qpSaving}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Categoria *
                  </label>
                  <select
                    className="w-full h-11 bg-slate-100/50 border border-slate-200 rounded-xl px-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer font-sans"
                    value={qpCategoria}
                    onChange={(e) => setQpCategoria(e.target.value)}
                    disabled={qpSaving}
                  >
                    {CATEGORIAS_PREDEFINIDAS.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Variação
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 2 Litros, 250ml"
                    className="w-full h-11 bg-slate-100/50 border border-slate-200 rounded-xl px-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all font-sans"
                    value={qpVariacao}
                    onChange={(e) => setQpVariacao(e.target.value)}
                    disabled={qpSaving}
                  />
                </div>
              </div>

              {qpCategoria === 'Outros' && (
                <div className="animate-in fade-in duration-200">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Especifique a Categoria *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Especifique a categoria..."
                    className="w-full h-11 bg-slate-100/50 border border-slate-200 rounded-xl px-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all font-sans"
                    value={qpCustomCategoria}
                    onChange={(e) => setQpCustomCategoria(e.target.value)}
                    disabled={qpSaving}
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Pontuação Base *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Ex: 10, 50"
                  className="w-full h-11 bg-slate-100/50 border border-slate-200 rounded-xl px-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all font-sans"
                  value={qpPontuacao}
                  onChange={(e) => setQpPontuacao(e.target.value)}
                  disabled={qpSaving}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Observação
                </label>
                <textarea
                  placeholder="Adicione observações se houver..."
                  rows={2}
                  className="w-full bg-slate-100/50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all resize-none font-sans text-xs"
                  value={qpObservacao}
                  onChange={(e) => setQpObservacao(e.target.value)}
                  disabled={qpSaving}
                />
              </div>

              {qpError && (
                <div className="flex items-center gap-1.5 p-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-[11px] font-bold uppercase tracking-wider leading-tight">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  <span>{qpError}</span>
                </div>
              )}

              {qpSuccess && (
                <div className="flex items-center gap-1.5 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-[11px] font-bold uppercase tracking-wider leading-tight">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>{qpSuccess}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickPrendaModalOpen(false)}
                  disabled={qpSaving}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={qpSaving}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 cursor-pointer"
                >
                  {qpSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
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
