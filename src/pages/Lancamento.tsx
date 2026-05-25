import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { mockCampanhas, addMockRecibo, ReciboItem, isCampanhaVigente, getLocalDataFmt } from '../lib/mock-data';
import { formatPoints } from '../lib/utils';
import { Search, Plus, Trash2, Zap, Save, User as UserIcon, Loader2, AlertCircle } from 'lucide-react';

interface Aluno {
  id: string;
  matricula: string;
  nome_completo: string;
  codigo_turma: string;
  turno: string;
  ano_serie?: string;
}

interface Prenda {
  id: string;
  nome_prenda: string;
  categoria?: string;
  variacao?: string;
  pontuacao_base: number;
  status: string;
}

export function Lancamento() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [buscaAluno, setBuscaAluno] = useState('');
  const [buscandoAlunos, setBuscandoAlunos] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState<Aluno | null>(null);
  
  // Autocomplete suggestions states
  const [sugestoes, setSugestoes] = useState<Aluno[]>([]);
  const [sugestoesLoading, setSugestoesLoading] = useState(false);
  const [sugestoesError, setSugestoesError] = useState<string | null>(null);
  const [showSugestoes, setShowSugestoes] = useState(false);
  const [sugestaoSelecionadaIdx, setSugestaoSelecionadaIdx] = useState(-1);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  const [prendas, setPrendas] = useState<Prenda[]>([]);
  const [loadingPrendas, setLoadingPrendas] = useState(true);
  const [errorPrendas, setErrorPrendas] = useState<string | null>(null);
  
  const [campanhas, setCampanhas] = useState<any[]>([]);
  
  const [filtraPrenda, setFiltraPrenda] = useState('');
  const [isAvulsa, setIsAvulsa] = useState(false);
  const [avulsaNome, setAvulsaNome] = useState('');
  const [avulsaPontos, setAvulsaPontos] = useState(100);

  const [prendaId, setPrendaId] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [itens, setItens] = useState<(ReciboItem & { prendaNome: string })[]>([]);
  const [observacao, setObservacao] = useState('');
  const [isConfirmacaoOpen, setIsConfirmacaoOpen] = useState(false);
  const [isLimparConfirmacaoOpen, setIsLimparConfirmacaoOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Auto-fetch suggestions on typing with 300ms debounce
  useEffect(() => {
    if (!buscaAluno.trim() || buscaAluno.trim().length < 2 || !profile) {
      setSugestoes([]);
      setSugestoesError(null);
      setShowSugestoes(false);
      setSugestaoSelecionadaIdx(-1);
      return;
    }

    setSugestoesLoading(true);
    setSugestoesError(null);

    const timer = setTimeout(async () => {
      try {
        let data: any[] | null = null;
        const qNormalized = buscaAluno.trim();

        try {
          // Prepare DB query for 'alunos'
          let query = supabase.from('alunos').select('*');
          
          // Filter by active status if column exists
          query = query.eq('status', 'ativo');

          // Search criteria (matricula starts with or name matching partially)
          query = query.or(`matricula.ilike.%${qNormalized}%,nome_completo.ilike.%${qNormalized}%`);

          // Operational shift restrictions matching Auth levels
          const userPerfil = profile.perfil?.toLowerCase();
          const userTurno = profile.turno?.toLowerCase();
          
          if (userPerfil === 'manha') {
            query = query.eq('turno', 'manha');
          } else if (userPerfil === 'tarde') {
            query = query.eq('turno', 'tarde');
          } else if (userPerfil === 'consulta' && userTurno && userTurno !== 'ambos') {
            query = query.eq('turno', userTurno);
          }

          // Limit suggestions to max 10 records
          query = query.limit(10);

          const res = await query;
          if (!res.error && res.data) {
            data = res.data;
          } else if (res.error) {
            console.warn('Autocomplete query failed on Supabase. Code/Message:', res.error);
          }
        } catch (dbErr) {
          console.warn('Failed querying live student suggestions:', dbErr);
        }

        // Offline storage Fallback
        if (!data || data.length === 0) {
          const localAlunosKey = localStorage.getItem('ctpm_alunos_v1');
          const localAlunosList = localAlunosKey ? JSON.parse(localAlunosKey) : [];
          
          const searchLow = qNormalized.toLowerCase();
          let filtered = localAlunosList.filter((al: any) => {
            const nameMatch = (al.nome_completo || al.nome || '').toLowerCase().includes(searchLow);
            const matriculaMatch = (al.matricula || '').toLowerCase().includes(searchLow);
            if (!nameMatch && !matriculaMatch) return false;

            const userPerfil = profile.perfil?.toLowerCase();
            const userTurno = profile.turno?.toLowerCase();
            if (userPerfil === 'manha') {
              return al.turno === 'manha';
            } else if (userPerfil === 'tarde') {
              return al.turno === 'tarde';
            } else if (userPerfil === 'consulta' && userTurno && userTurno !== 'ambos') {
              return al.turno === userTurno;
            }
            return true;
          });

          // Ensure active status exists or default true in fallback local matches
          filtered = filtered.filter((al: any) => !al.status || al.status.toLowerCase() === 'ativo' || al.status.toLowerCase() === 'ativa');
          data = filtered.slice(0, 10);
        }

        const mappedSuggestions = (data || []).map((al: any) => ({
          id: al.id,
          matricula: al.matricula,
          nome_completo: al.nome_completo || al.nome || '',
          codigo_turma: al.codigo_turma || al.turmaId || al.turma || '',
          ano_serie: al.ano_serie || 'EFAI',
          turno: al.turno
        }));

        setSugestoes(mappedSuggestions);
        setShowSugestoes(true);
        setSugestaoSelecionadaIdx(-1);
      } catch (err) {
        console.error('Erro na carga das sugestões do autocomplete:', err);
        setSugestoesError('Não foi possível buscar alunos. Tente novamente.');
      } finally {
        setSugestoesLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [buscaAluno, profile]);

  // Click outside detection to collapse suggestions panel safely
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowSugestoes(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelectAluno = (aluno: Aluno) => {
    setAlunoSelecionado({
      id: aluno.id,
      matricula: aluno.matricula,
      nome_completo: aluno.nome_completo,
      codigo_turma: aluno.codigo_turma,
      ano_serie: aluno.ano_serie || 'EFAI',
      turno: aluno.turno
    });
    setBuscaAluno('');
    setSugestoes([]);
    setShowSugestoes(false);
    setSugestaoSelecionadaIdx(-1);
  };

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSugestoes || sugestoes.length === 0) {
      if (e.key === 'Enter') {
        handleBuscarAluno();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSugestaoSelecionadaIdx(prev => (prev + 1) % sugestoes.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSugestaoSelecionadaIdx(prev => (prev - 1 + sugestoes.length) % sugestoes.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (sugestaoSelecionadaIdx >= 0 && sugestaoSelecionadaIdx < sugestoes.length) {
        handleSelectAluno(sugestoes[sugestaoSelecionadaIdx]);
      } else {
        handleSelectAluno(sugestoes[0]);
      }
    } else if (e.key === 'Escape') {
      setShowSugestoes(false);
    }
  };

  useEffect(() => {
    console.log('Perfil logado no lançamento:', profile);
    fetchPrendas();
    fetchCampanhas();
  }, [profile]);

  const fetchPrendas = async () => {
    console.log('Carregando prendas...');
    setLoadingPrendas(true);
    setErrorPrendas(null);

    try {
      let data: any[] | null = null;
      try {
        const res = await supabase
          .from('prendas')
          .select('id, nome_prenda, categoria, variacao, pontuacao_base, status')
          .eq('status', 'ativo')
          .order('nome_prenda', { ascending: true });
        
        if (!res.error && res.data && res.data.length > 0) {
          data = res.data;
        }
      } catch (e) {
        console.warn('Supabase fetch prendas failed, using local DB:', e);
      }

      // Fallback
      if (!data) {
        const localPrendasKey = localStorage.getItem('ctpm_prendas_v1');
        data = localPrendasKey ? JSON.parse(localPrendasKey) : [];
      }

      // Map to consistent structure
      const mappedPrendas = (data || []).map((p: any) => ({
        id: p.id,
        nome_prenda: p.nome_prenda || p.nome || '',
        categoria: p.categoria || '',
        variacao: p.variacao || '',
        pontuacao_base: Number(p.pontuacao_base || p.pontuacaoBase || 0),
        status: p.status || 'ativo'
      }));

      setPrendas(mappedPrendas);
      
      if (mappedPrendas.length === 0) {
        setErrorPrendas('Nenhuma prenda ativa cadastrada.');
      }
    } catch (err) {
      console.error('Erro ao buscar prendas:', err);
      setErrorPrendas('Erro ao carregar prendas. Verifique a conexão.');
    } finally {
      setLoadingPrendas(false);
    }
  };

  const handleBuscarAluno = async () => {
    if (!buscaAluno.trim() || !profile) return;
    setBuscandoAlunos(true);

    try {
      let data: any[] | null = null;
      try {
        let query = supabase.from('alunos').select('*');
        // Busca por matrícula exata ou nome parcial
        query = query.or(`matricula.eq.${buscaAluno},nome_completo.ilike.%${buscaAluno}%`);

        // Filtro de turno conforme perfil oficial do banco
        if (profile.perfil === 'manha') {
          query = query.eq('turno', 'manha');
        } else if (profile.perfil === 'tarde') {
          query = query.eq('turno', 'tarde');
        }

        const res = await query;
        if (!res.error && res.data && res.data.length > 0) {
          data = res.data;
        }
      } catch (e) {
        console.warn('Supabase query failed, falling back to local DB:', e);
      }

      // Fallback to local storage database check if supabase query failed or returned no results
      if (!data || data.length === 0) {
        const localAlunosKey = localStorage.getItem('ctpm_alunos_v1');
        const localAlunosList = localAlunosKey ? JSON.parse(localAlunosKey) : [];
        
        const q = buscaAluno.trim().toLowerCase();
        data = localAlunosList.filter((al: any) => {
          // Check matching name or matricula
          const nameMatch = (al.nome_completo || al.nome || '').toLowerCase().includes(q);
          const matriculaMatch = (al.matricula || '').toLowerCase() === q;
          
          if (!nameMatch && !matriculaMatch) return false;
          
          // Check matching shifts rules
          if (profile.perfil === 'manha') {
            return al.turno === 'manha';
          } else if (profile.perfil === 'tarde') {
            return al.turno === 'tarde';
          }
          return true;
        });
      }

      if (data && data.length > 0) {
        // Se houver resultados, pegamos o primeiro e preenchemos os campos oficiais
        const aluno = data[0];
        setAlunoSelecionado({
          id: aluno.id,
          matricula: aluno.matricula,
          nome_completo: aluno.nome_completo || aluno.nome,
          codigo_turma: aluno.codigo_turma || aluno.turmaId || aluno.turma || '',
          ano_serie: aluno.ano_serie || 'EFAI',
          turno: aluno.turno
        });
        setBuscaAluno('');
      } else {
        console.warn('Aluno não encontrado para os critérios e permissões do usuário.');
        alert('Aluno não encontrado para os critérios e permissões do usuário.');
      }
    } catch (err) {
      console.error('Erro ao buscar aluno:', err);
    } finally {
      setBuscandoAlunos(false);
    }
  };

  const fetchCampanhas = async () => {
    try {
      console.log('Carregando campanhas relâmpago ativas do Supabase...');
      let data: any[] | null = null;
      try {
        const res = await supabase
          .from('campanhas_relampago')
          .select('*')
          .eq('status', 'ativa');

        if (!res.error && res.data && res.data.length > 0) {
          data = res.data;
        }
      } catch (e) {
        console.warn('Supabase campaigns fetch failed, using local DB:', e);
      }

      if (!data) {
        const localCampanhasKey = localStorage.getItem('ctpm_campanhas_v1');
        data = localCampanhasKey ? JSON.parse(localCampanhasKey) : [];
      }

      // Map to have uniform fields
      const mappedCampanhas = (data || []).map((c: any) => ({
        id: c.id,
        nome_campanha: c.nome_campanha || c.nome || '',
        prenda_id: c.prenda_id || c.prendaId || '',
        multiplicador: Number(c.multiplicador || 1),
        data_inicio: c.data_inicio || c.dataInicial || '',
        data_fim: c.data_fim || c.dataFinal || '',
        turno_aplicacao: c.turno_aplicacao || c.turnoAplicacao || 'ambos',
        status: c.status || 'ativa'
      }));

      console.log('Campanhas carregadas no lançamento:', mappedCampanhas);
      setCampanhas(mappedCampanhas);
    } catch (err) {
      console.error('Erro ao buscar campanhas:', err);
    }
  };

  const getCampanhaAtiva = (pId: string, turno: string) => {
    return campanhas.find(c => 
      c.prenda_id === pId && 
      isCampanhaVigente(c) &&
      (c.turno_aplicacao === 'ambos' || c.turno_aplicacao.toLowerCase() === turno.toLowerCase())
    );
  };

  const getTurnoReferencia = () => {
    if (alunoSelecionado) {
      return alunoSelecionado.turno;
    }
    if (profile?.turno && profile.turno !== 'ambos') {
      return profile.turno;
    }
    if (profile?.perfil === 'tarde') {
      return 'tarde';
    }
    return 'manha';
  };

  const handleAdicionarItem = () => {
    if (!alunoSelecionado || quantidade <= 0) return;

    if (isAvulsa) {
      if (!avulsaNome.trim() || avulsaPontos <= 0) {
        alert('Digite o nome e a pontuação base da prenda avulsa.');
        return;
      }
      const subtotal = quantidade * avulsaPontos;
      const novoItem = {
        id: `tmp_av_${Date.now()}`,
        reciboId: '',
        prendaId: 'avulsa',
        prendaNome: `${avulsaNome.trim()} (Avulso)`,
        quantidade,
        pontuacaoBase: avulsaPontos,
        multiplicadorAplicado: 1,
        subtotal,
        campanhaAplicada: false
      };
      setItens([...itens, novoItem]);
      setAvulsaNome('');
      setAvulsaPontos(100);
      setQuantidade(1);
    } else {
      if (!prendaId) return;

      const prenda = prendas.find(p => p.id === prendaId);
      if (!prenda) return;

      const campanha = getCampanhaAtiva(prenda.id, alunoSelecionado.turno);
      console.log(campanha ? `Campanha relâmpago encontrada para prenda ${prenda.nome_prenda}:` : 'Nenhuma campanha relâmpago ativa encontrada para esta seleção.', campanha || '');
      
      const multiplicador = campanha ? campanha.multiplicador : 1;
      const subtotal = quantidade * prenda.pontuacao_base * multiplicador;

      const displayNome = prenda.variacao 
        ? `${prenda.nome_prenda} — ${prenda.variacao}`
        : prenda.nome_prenda;

      const novoItem = {
        id: `tmp_${Date.now()}`,
        reciboId: '', 
        prendaId: prenda.id,
        prendaNome: displayNome,
        quantidade,
        pontuacaoBase: prenda.pontuacao_base,
        multiplicadorAplicado: multiplicador,
        subtotal,
        campanhaAplicada: !!campanha,
        campanhaRelampagoId: campanha ? campanha.id : undefined
      };

      setItens([...itens, novoItem]);
      setPrendaId('');
      setQuantidade(1);
    }
  };

  const handleRemoverItem = (id: string) => {
    setItens(itens.filter(i => i.id !== id));
  };

  const handleEditarItem = (item: ReciboItem & { prendaNome: string }) => {
    setPrendaId(item.prendaId);
    setQuantidade(item.quantidade);
    handleRemoverItem(item.id);
  };

  const handleLimparLancamento = () => {
    setIsLimparConfirmacaoOpen(true);
  };

  const confirmarLimparItens = () => {
    setItens([]);
    setPrendaId('');
    setQuantidade(1);
    setObservacao('');
    
    // Limpa dados temporários salvos no localStorage do lançamento em andamento
    try {
      localStorage.removeItem('ctpm_lancamento_itens_draft');
      localStorage.removeItem('ctpm_lancamento_observacao_draft');
      localStorage.removeItem('ctpm_prenda_selecionada');
      localStorage.removeItem('ctpm_prenda_quantidade');
    } catch (e) {
      console.error('Failure clearing localStorage draft keys:', e);
    }
    
    setIsLimparConfirmacaoOpen(false);
  };

  const totalGeral = itens.reduce((acc, item) => acc + item.subtotal, 0);

  const handleOpenConfirmacao = () => {
    if (!alunoSelecionado) {
      alert('Selecione um aluno antes de gerar o recibo.');
      return;
    }
    if (itens.length === 0) {
      alert('Adicione pelo menos uma prenda ao recibo.');
      return;
    }
    setIsConfirmacaoOpen(true);
  };

  const handleGerarReciboFinal = async () => {
    if (!alunoSelecionado || itens.length === 0 || !profile || salvando) return;

    setSalvando(true);
    try {
      // Mapeamos os itens salvando snapshots dos dados e os IDs de campanha
      const itensComSnapshots = itens.map(item => {
        const matchPrenda = prendas.find(p => p.id === item.prendaId);
        const campanhaInfo = getCampanhaAtiva(item.prendaId, alunoSelecionado.turno);
        
        const nome_prenda = matchPrenda?.nome_prenda || item.prendaNome.split(' — ')[0];
        const variacao = matchPrenda?.variacao || undefined;
        const nome_campanha = campanhaInfo?.nome_campanha || undefined;

        return {
          id: item.id.startsWith('tmp_') ? `ri_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` : item.id,
          reciboId: '',
          prendaId: item.prendaId,
          quantidade: item.quantidade,
          pontuacaoBase: item.pontuacaoBase,
          multiplicadorAplicado: item.multiplicadorAplicado,
          subtotal: item.subtotal,
          campanhaAplicada: item.campanhaAplicada,
          campanhaRelampagoId: item.campanhaRelampagoId || campanhaInfo?.id || undefined,
          nome_prenda,
          variacao,
          campanha_relampago_aplicada: item.campanhaAplicada ? 'sim' : 'não' as 'sim' | 'não',
          nome_campanha
        };
      });

      const novoRecibo = await addMockRecibo({
        dataHora: new Date().toISOString(),
        alunoId: alunoSelecionado.id,
        turmaId: alunoSelecionado.codigo_turma, 
        turno: alunoSelecionado.turno as any,
        total_pontos: totalGeral,
        usuarioId: profile.id,
        status: 'ativo',
        observacao: observacao.trim() || undefined,
        itens: itensComSnapshots,
        
        // Snapshots do aluno
        aluno_nome: alunoSelecionado.nome_completo,
        aluno_matricula: alunoSelecionado.matricula,
        aluno_turma: alunoSelecionado.codigo_turma,
        aluno_turno: alunoSelecionado.turno,

        // Snapshots do usuário responsável
        usuario_responsavel_nome: profile.nome,
        usuario_responsavel_perfil: profile.perfil
      });

      // Limpa dados temporários salvos no localStorage
      try {
        localStorage.removeItem('ctpm_lancamento_itens_draft');
        localStorage.removeItem('ctpm_lancamento_observacao_draft');
        localStorage.removeItem('ctpm_prenda_selecionada');
        localStorage.removeItem('ctpm_prenda_quantidade');
      } catch (e) {
        console.error('Failure clearing draft keys:', e);
      }

      setIsConfirmacaoOpen(false);
      navigate(`/recibo/${novoRecibo.id}`);
    } catch (err: any) {
      console.error('Erro ao salvar recibo:', err);
      alert(err?.message || 'Não foi possível salvar o recibo no banco de dados. Verifique a conexão e tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Modal de Confirmação para Limpar Itens */}
      {isLimparConfirmacaoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            onClick={() => setIsLimparConfirmacaoOpen(false)}
          />
          <div className="relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col p-6 text-center">
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 text-amber-600 mb-4 animate-bounce">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Deseja limpar os itens deste lançamento?</h3>
              <p className="text-sm text-slate-500 mt-2">Esta ação apagará todas as prendas adicionadas e observações deste lançamento. O aluno selecionado permanecerá na tela.</p>
            </div>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setIsLimparConfirmacaoOpen(false)}
                className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarLimparItens}
                className="px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md shadow-amber-100 active:scale-95"
              >
                Sim, limpar itens
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação */}
      {isConfirmacaoOpen && alunoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            onClick={() => setIsConfirmacaoOpen(false)}
          />
          <div className="relative bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-5 md:p-8 pb-4 border-b border-slate-100 shrink-0">
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Confirmar lançamento</h2>
              <p className="text-slate-500 font-bold text-[10px] md:text-xs uppercase tracking-widest mt-1">Confira as informações antes de gerar o recibo.</p>
            </div>

            <div className="p-5 md:p-8 overflow-y-auto space-y-6 flex-1 min-w-0">
              {/* Dados do Aluno */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Aluno</span>
                  <span className="font-bold text-slate-900 text-sm break-words whitespace-normal leading-tight">{alunoSelecionado.nome_completo}</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Matrícula</span>
                  <span className="font-mono text-xs text-slate-700 break-all">{alunoSelecionado.matricula}</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Turma</span>
                  <span className="font-bold text-indigo-600 text-xs tracking-tight">{alunoSelecionado.codigo_turma}</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Turno</span>
                  <span className="font-bold text-slate-700 text-xs uppercase tracking-widest">
                    {alunoSelecionado.turno === 'manha' ? 'Manhã' : 'Tarde'}
                  </span>
                </div>
              </div>

              {/* Itens */}
              <div>
                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-3 ml-1">Itens do Recibo</h3>
                
                {/* Mobile view - Card stack */}
                <div className="block md:hidden space-y-3">
                  {itens.map(item => (
                    <div key={item.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2 min-w-0 w-full max-w-full">
                      <div className="flex items-start justify-between gap-3 min-w-0 w-full">
                        <div className="flex items-start flex-wrap gap-1.5 leading-normal font-extrabold text-slate-800 break-words whitespace-normal text-xs min-w-0 flex-1 max-w-full">
                          <span className="break-words max-w-full whitespace-normal leading-tight">{item.prendaNome}</span>
                          {item.campanhaAplicada && (
                            <span className="inline-flex items-center gap-0.5 bg-amber-500 text-white font-black text-[8px] px-1.5 py-0.5 rounded-full uppercase tracking-wider select-none shrink-0 leading-none">
                              <Zap className="h-2 w-2 fill-white" />
                              <span>RELÂMPAGO {item.multiplicadorAplicado}x</span>
                            </span>
                          )}
                        </div>
                        <span className="shrink-0 text-slate-950 font-black text-right text-xs whitespace-nowrap pt-0.5">
                          {formatPoints(item.subtotal)} PTS
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-[10px] uppercase font-black tracking-wider text-slate-400">
                        <div>
                          <span className="block text-[8px] text-slate-400 font-medium lowercase">Qtd</span>
                          <span className="font-bold text-slate-700">{item.quantidade}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] text-slate-400 font-medium lowercase">Base</span>
                          <span className="font-mono text-slate-500">{item.pontuacaoBase} pts</span>
                        </div>
                        <div>
                          <span className="block text-[8px] text-slate-400 font-medium lowercase">Mult</span>
                          <span className="font-bold text-slate-700">
                            {item.multiplicadorAplicado > 1 ? `${item.multiplicadorAplicado}x` : '1x'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* total cards for mobile view */}
                  <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex justify-between items-center min-w-0 w-full max-w-full">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 leading-none mb-1">Total Geral</span>
                      <span className="text-xs font-bold text-indigo-700">{itens.length} {itens.length === 1 ? 'item' : 'itens'}</span>
                    </div>
                    <span className="text-xl font-black text-indigo-700 tracking-tighter shrink-0 whitespace-nowrap">
                      {formatPoints(totalGeral)} <span className="text-[10px] font-normal font-sans tracking-normal ml-0.5">PTS</span>
                    </span>
                  </div>
                </div>

                {/* Desktop view - Traditional table */}
                <div className="hidden md:block border border-slate-100 rounded-2xl overflow-x-auto min-w-0 max-w-full">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400">
                      <tr>
                        <th className="px-4 py-3 min-w-0">Item</th>
                        <th className="px-4 py-3 text-center w-16">Qtd</th>
                        <th className="px-4 py-3 text-right w-20">Pts</th>
                        <th className="px-4 py-3 text-center w-16">Mult</th>
                        <th className="px-4 py-3 text-right w-28">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {itens.map(item => (
                        <tr key={item.id} className="text-slate-700">
                          <td className="px-4 py-3 font-bold break-words whitespace-normal min-w-0 max-w-xs md:max-w-md">
                            <div className="flex items-center flex-wrap gap-1.5 leading-normal">
                              <span className="break-words whitespace-normal leading-tight">{item.prendaNome}</span>
                              {item.campanhaAplicada && (
                                <span className="inline-flex items-center gap-0.5 bg-amber-500 text-white font-black text-[8px] px-1.5 py-0.5 rounded-full uppercase tracking-wider select-none shrink-0 leading-none">
                                  <Zap className="h-2 w-2 fill-white shrink-0" />
                                  <span>RELÂMPAGO {item.multiplicadorAplicado}x</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-bold w-16">{item.quantidade}</td>
                          <td className="px-4 py-3 text-right text-slate-400 font-mono w-20">{item.pontuacaoBase}</td>
                          <td className="px-4 py-3 text-center w-16">
                            {item.multiplicadorAplicado > 1 ? `${item.multiplicadorAplicado}x` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-indigo-600 w-28">
                            {formatPoints(item.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-black border-t border-slate-100">
                      <tr className="text-slate-900">
                        <td className="px-4 py-3 text-[9px] uppercase tracking-widest">Total</td>
                        <td className="px-4 py-3 text-center">{itens.length} {itens.length === 1 ? 'Item' : 'Itens'}</td>
                        <td colSpan={3} className="px-4 py-3 text-right text-lg tracking-tighter">
                          {formatPoints(totalGeral)} <span className="text-[10px] font-normal font-sans tracking-normal ml-0.5">PTS</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Observação */}
              <div>
                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1.5 ml-1">Observação</h3>
                <div className="bg-white border border-slate-100 p-4 rounded-2xl text-xs font-medium text-slate-500 italic break-words whitespace-normal leading-relaxed w-full max-w-full">
                  {observacao.trim() ? observacao : 'Sem observação'}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3 w-full max-w-full">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-amber-800 leading-tight break-words whitespace-normal max-w-full">
                  Após confirmar, o recibo será gerado. Confira se os dados estão corretos.
                </p>
              </div>
            </div>

            <div className="p-5 md:p-8 border-t border-slate-100 bg-slate-50 shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4">
              <button
                onClick={() => setIsConfirmacaoOpen(false)}
                className="px-6 py-3 font-black text-xs text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors w-full sm:w-auto text-center"
              >
                Voltar e corrigir
              </button>
              <button
                onClick={handleGerarReciboFinal}
                disabled={salvando}
                className="flex items-center justify-center gap-2 px-8 py-3.5 bg-emerald-600 disabled:bg-emerald-400 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 active:scale-95 cursor-pointer disabled:cursor-not-allowed w-full sm:w-auto"
              >
                {salvando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>Gerando recibo...</span>
                  </>
                ) : (
                  <span>Confirmar e gerar recibo</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Lançamento de Prendas</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Coluna Esquerda: Busca e Adição */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Card Aluno */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center text-sm uppercase tracking-widest">
              <UserIcon className="h-4 w-4 mr-2 text-indigo-500" />
              1. Aluno
            </h2>
            
            {!alunoSelecionado ? (
              <div ref={autocompleteRef} className="relative space-y-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex justify-between">
                    <span>Matrícula ou Nome</span>
                    {(buscandoAlunos || sugestoesLoading) && <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />}
                  </label>
                  <div className="flex space-x-2">
                    <input 
                      type="text" 
                      className="flex-1 rounded-lg border-slate-200 border px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      placeholder="Ex: 2026001 ou Ana"
                      value={buscaAluno}
                      disabled={buscandoAlunos}
                      onChange={e => setBuscaAluno(e.target.value)}
                      onKeyDown={handleKeyDownInput}
                    />
                    <button 
                      onClick={handleBuscarAluno}
                      disabled={buscandoAlunos || !buscaAluno.trim()}
                      className="bg-slate-900 text-white px-3 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-lg shadow-slate-100"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Sugestões do Autocomplete Dropdown */}
                  {showSugestoes && (
                    <div className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-2xl focus:outline-none divide-y divide-slate-100">
                      {sugestoes.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500 font-medium italic">
                          Nenhum aluno encontrado.
                        </div>
                      ) : (
                        sugestoes.map((al, idx) => {
                          const isHighlighted = idx === sugestaoSelecionadaIdx;
                          const shiftLabel = al.turno.toLowerCase() === 'manha' || al.turno.toLowerCase() === 'manhã' ? 'Matutino' : 'Vespertino';
                          return (
                            <div 
                              key={al.id}
                              onClick={() => handleSelectAluno(al)}
                              onMouseEnter={() => setSugestaoSelecionadaIdx(idx)}
                              className={`p-3 text-xs cursor-pointer select-none transition-colors text-left ${isHighlighted ? 'bg-indigo-55 bg-indigo-50 text-indigo-900 font-medium' : 'text-slate-700 bg-white hover:bg-slate-50'}`}
                            >
                              <div className="font-bold text-slate-900 text-sm">{al.nome_completo}</div>
                              <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
                                Matrícula: <span className="font-mono text-slate-700">{al.matricula}</span> • Turma: <span className="text-indigo-600 font-bold">{al.codigo_turma}</span> • {shiftLabel}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {sugestoesError && (
                    <p className="mt-1-5 text-[10px] font-bold text-red-650 text-red-600 text-left">
                      {sugestoesError}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative shadow-inner">
                <button 
                  onClick={() => { setAlunoSelecionado(null); setItens([]); }}
                  className="absolute top-3 right-3 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  Trocar
                </button>
                <div className="space-y-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome Completo</span>
                    <span className="font-bold text-slate-900 text-sm leading-tight">{alunoSelecionado.nome_completo}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Matrícula</span>
                      <span className="text-slate-700 font-mono text-xs">{alunoSelecionado.matricula}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Turma</span>
                      <span className="text-indigo-700 font-black text-xs">{alunoSelecionado.codigo_turma}</span>
                    </div>
                  </div>
                  <div className="pt-1">
                     <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${alunoSelecionado.turno.toLowerCase() === 'manha' || alunoSelecionado.turno.toLowerCase() === 'manhã' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                       Turno {alunoSelecionado.turno.toLowerCase() === 'manha' || alunoSelecionado.turno.toLowerCase() === 'manhã' ? 'Manhã' : 'Tarde'}
                     </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card Adicionar Item */}
          <div className={`bg-white p-5 rounded-xl shadow-sm border border-slate-200 transition-opacity`}>
            <h2 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 text-sm uppercase tracking-widest flex justify-between items-center">
              <span>2. Prenda</span>
              <label className="flex items-center text-[10px] font-black uppercase tracking-widest cursor-pointer text-indigo-600 select-none">
                <input 
                  type="checkbox" 
                  className="mr-1.5 h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                  checked={isAvulsa}
                  onChange={e => {
                    setIsAvulsa(e.target.checked);
                    setPrendaId('');
                    setFiltraPrenda('');
                  }}
                />
                Item Avulso
              </label>
            </h2>
            
            <div className="space-y-4">
              {isAvulsa ? (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nome do Item Avulso</label>
                    <input 
                      type="text"
                      placeholder="Ex: Doação de Livros"
                      className="w-full rounded-lg border-slate-200 border px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      value={avulsaNome}
                      onChange={e => setAvulsaNome(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pontuação Base</label>
                    <input 
                      type="number"
                      min="1"
                      placeholder="Pontos base"
                      className="w-full rounded-lg border-slate-200 border px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      value={avulsaPontos}
                      onChange={e => setAvulsaPontos(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Filtrar prendas por nome</label>
                    <input 
                      type="text"
                      placeholder="Digite para filtrar..."
                      className="w-full rounded-lg border-slate-200 border px-3 py-1.5 text-xs focus:ring-indigo-500 focus:border-indigo-500 outline-none mb-2"
                      value={filtraPrenda}
                      onChange={e => setFiltraPrenda(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Selecione o item (auto-preenche pontos base)</label>
                    <select 
                      className={`w-full rounded-lg border-slate-200 border px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all ${errorPrendas ? 'border-red-300 bg-red-50' : ''}`}
                      value={prendaId}
                      onChange={e => setPrendaId(e.target.value)}
                      disabled={loadingPrendas || !!errorPrendas}
                    >
                      <option value="">{loadingPrendas ? 'Carregando prendas...' : errorPrendas || '-- Selecione ou busque acima --'}</option>
                      {prendas.filter(p => !filtraPrenda.trim() || p.nome_prenda.toLowerCase().includes(filtraPrenda.toLowerCase()) || (p.variacao || '').toLowerCase().includes(filtraPrenda.toLowerCase())).map(p => {
                        const turnoRef = getTurnoReferencia();
                        const campanha = getCampanhaAtiva(p.id, turnoRef);
                        const labelBase = p.variacao 
                          ? `${p.nome_prenda} — ${p.variacao} — ${p.pontuacao_base} pts`
                          : `${p.nome_prenda} — ${p.pontuacao_base} pts`;
                        
                        const label = campanha 
                          ? `${labelBase} ⚡ CAMPANHA ${campanha.multiplicador}x`
                          : labelBase;
                          
                        return (
                          <option key={p.id} value={p.id}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                    {errorPrendas && (
                      <p className="mt-1 text-[10px] font-bold text-red-600">{errorPrendas}</p>
                    )}
                    {prendaId && (() => {
                      const turnoRef = getTurnoReferencia();
                      const c = getCampanhaAtiva(prendaId, turnoRef);
                      if (!c) return null;
                      
                      const formatoData = (dataStr: string) => {
                        if (!dataStr) return '';
                        const partes = dataStr.split('-');
                        if (partes.length === 3) {
                          return `${partes[2]}/${partes[1]}/${partes[0]}`;
                        }
                        return dataStr;
                      };

                      const turnoDesc = c.turno_aplicacao === 'ambos' 
                        ? 'Todos os turnos (Manhã e Tarde)' 
                        : (c.turno_aplicacao.toLowerCase() === 'manha' ? 'Turno Manhã' : 'Turno Tarde');

                      return (
                        <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900 shadow-sm animate-fade-in text-left">
                          <div className="flex items-center gap-1.5 font-extrabold text-amber-800 uppercase tracking-wider">
                            <Zap className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />
                            <span>⚡ Campanha relâmpago ativa</span>
                          </div>
                          
                          <p className="font-semibold text-amber-700">
                            Esta prenda está valendo {c.multiplicador}x pontos neste período.
                          </p>
                          
                          <div className="pt-1.5 border-t border-amber-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-medium">
                            <div className="truncate">
                              <strong className="text-amber-800">Campanha:</strong> {c.nome_campanha || c.nome}
                            </div>
                            <div>
                              <strong className="text-amber-800">Multiplicador:</strong> {c.multiplicador}x
                            </div>
                            <div>
                              <strong className="text-amber-850">Turno Aplicável:</strong> {turnoDesc}
                            </div>
                            <div>
                              <strong className="text-amber-800">Vigência:</strong> {formatoData(c.data_inicio || c.dataInicial)} até {formatoData(c.data_fim || c.dataFinal)}
                            </div>
                          </div>
                          
                          {(c.observacao || c.observacao_geral) && (
                            <div className="mt-1 pt-1.5 border-t border-amber-100 text-[10px] italic text-amber-700 leading-normal">
                              <strong className="text-[10px] font-bold not-italic text-amber-850 font-sans">Observação:</strong> {c.observacao || c.observacao_geral}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Quantidade</label>
                <input 
                  type="number" 
                  min="1"
                  className="w-full rounded-lg border-slate-200 border px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  value={quantidade}
                  onChange={e => setQuantidade(parseInt(e.target.value) || 1)}
                />
              </div>

              {((!isAvulsa && prendaId) || (isAvulsa && avulsaNome.trim())) && (() => {
                const selectedPrenda = isAvulsa ? null : prendas.find(x => x.id === prendaId);
                const basePts = isAvulsa ? avulsaPontos : (selectedPrenda?.pontuacao_base || 0);
                const turnoRef = getTurnoReferencia();
                const campanha = isAvulsa ? null : getCampanhaAtiva(prendaId, turnoRef);
                const multiplicador = campanha ? campanha.multiplicador : 1;
                const qtd = quantidade || 1;
                const subtotal = qtd * basePts * multiplicador;
                
                return (
                  <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-500">Subtotal:</span>
                    <strong className="text-sm font-black text-indigo-700 tracking-tight">
                      {formatPoints(subtotal)} pts
                    </strong>
                  </div>
                );
              })()}

              <button 
                onClick={handleAdicionarItem}
                disabled={!alunoSelecionado || (isAvulsa ? (!avulsaNome.trim() || avulsaPontos <= 0 || quantidade < 1) : (!prendaId || quantidade < 1))}
                className="w-full flex justify-center items-center bg-slate-900 text-white px-4 py-3 rounded-xl hover:bg-slate-800 disabled:opacity-50 mt-2 transition-all font-black uppercase text-xs tracking-widest shadow-lg shadow-slate-100 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4 mr-2" /> {alunoSelecionado ? 'Adicionar' : 'Identifique o aluno primeiro'}
              </button>
            </div>
          </div>

        </div>

        {/* Coluna Direita: Tabela de Itens e Resumo */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white flex flex-col h-full rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-10">
              <h2 className="font-bold text-slate-800 text-sm uppercase tracking-widest">
                3. Itens do Recibo
              </h2>
              <span className="text-[10px] font-black bg-slate-900 px-2.5 py-1 rounded-full text-white uppercase tracking-widest">
                {itens.length} {itens.length === 1 ? 'item' : 'itens'}
              </span>
            </div>
            
            <div className="flex-1 overflow-x-auto min-h-[300px]">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="px-5 py-3 border-b border-slate-100">Item</th>
                    <th className="px-5 py-3 border-b border-slate-100 text-center">Qtd</th>
                    <th className="px-5 py-3 border-b border-slate-100 text-right">Pts</th>
                    <th className="px-5 py-3 border-b border-slate-100 text-center">Mult</th>
                    <th className="px-5 py-3 border-b border-slate-100 text-right">Total</th>
                    <th className="px-5 py-3 border-b border-slate-100"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {itens.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-24 text-center text-slate-400 font-medium italic">
                        O recibo está vazio. Comece identificando o aluno e adicionando prendas.
                      </td>
                    </tr>
                  ) : (
                    itens.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-800 flex items-center flex-wrap gap-2">
                            <span>{item.prendaNome}</span>
                            {item.campanhaAplicada && (
                              <span className="inline-flex items-center gap-1 bg-amber-500 text-white font-black text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider select-none shrink-0 leading-none">
                                <Zap className="h-2.5 w-2.5 fill-white shrink-0" />
                                <span>RELÂMPAGO {item.multiplicadorAplicado}x</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center font-bold text-slate-700">{item.quantidade}</td>
                        <td className="px-5 py-4 text-right font-mono text-xs text-slate-400">{item.pontuacaoBase}</td>
                        <td className="px-5 py-4 text-center">
                          {item.multiplicadorAplicado > 1 ? (
                            <span className="inline-flex bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-black">
                              {item.multiplicadorAplicado}x
                            </span>
                          ) : <span className="text-slate-200">1x</span>}
                        </td>
                        <td className="px-5 py-4 text-right font-black text-indigo-700">
                          {formatPoints(item.subtotal)}
                        </td>
                        <td className="px-5 py-4 text-right space-x-4">
                          <button 
                            onClick={() => handleEditarItem(item)}
                            className="text-xs font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-600 transition-colors"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleRemoverItem(item.id)}
                            className="text-slate-300 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4 inline-block" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Observação do Lançamento</label>
                <textarea
                  rows={2}
                  value={observacao}
                  onChange={e => setObservacao(e.target.value)}
                  className="w-full rounded-xl border-slate-200 border px-4 py-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:italic"
                  placeholder="Informações adicionais se necessário..."
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex flex-col">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Consolidado</p>
                  <p className="text-5xl font-black text-slate-900 tracking-tighter drop-shadow-sm">{formatPoints(totalGeral)} <span className="text-xl font-normal text-slate-300 font-sans tracking-normal ml-1">PTS</span></p>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleLimparLancamento}
                    className="px-4 py-2 text-slate-400 hover:text-slate-600 font-black text-[10px] uppercase tracking-widest transition-all"
                  >
                    Limpar itens
                  </button>
                  <button
                    onClick={handleOpenConfirmacao}
                    disabled={itens.length === 0}
                    className="flex items-center px-8 py-4 bg-emerald-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-xl shadow-emerald-100 active:scale-95"
                  >
                    <Save className="h-4 w-4 mr-2.5" />
                    Gerar Recibo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
