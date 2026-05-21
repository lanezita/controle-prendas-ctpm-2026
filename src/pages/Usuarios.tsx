import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { 
  Shield, User, Edit2, Search, Filter, AlertCircle, 
  CheckCircle2, XCircle, Clock, Loader2, ArrowRight, UserCheck, UserPlus
} from 'lucide-react';

interface UsuarioPerfil {
  id: string;
  nome: string;
  email: string | null;
  perfil: 'admin' | 'manha' | 'tarde' | 'consulta';
  turno: 'manha' | 'tarde' | 'ambos' | null;
  status: 'ativo' | 'inativo';
  created_at?: string;
  updated_at?: string;
}

export function Usuarios() {
  const { profile: loggedProfile } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioPerfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroPerfil, setFiltroPerfil] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  // Estados do Modal de Edição
  const [userEdicao, setUserEdicao] = useState<UsuarioPerfil | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erroModal, setErroModal] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Estados de Formulário
  const [nomeForm, setNomeForm] = useState('');
  const [perfilForm, setPerfilForm] = useState<'admin' | 'manha' | 'tarde' | 'consulta'>('consulta');
  const [turnoForm, setTurnoForm] = useState<'manha' | 'tarde' | 'ambos'>('ambos');
  const [statusForm, setStatusForm] = useState<'ativo' | 'inativo'>('ativo');

  // Estados do Modal de Convite (Fase 2B)
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [erroInviteModal, setErroInviteModal] = useState('');
  
  // Estados de Formulário do Convite
  const [inviteNome, setInviteNome] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePerfil, setInvitePerfil] = useState<'admin' | 'manha' | 'tarde' | 'consulta'>('consulta');
  const [inviteTurno, setInviteTurno] = useState<'manha' | 'tarde' | 'ambos'>('ambos');
  const [inviteStatus, setInviteStatus] = useState<'ativo' | 'inativo'>('ativo');

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('usuarios_perfis')
        .select('*')
        .order('nome', { ascending: true });

      if (error) {
        throw error;
      }
      setUsuarios(data || []);
    } catch (err) {
      console.error('Erro ao buscar perfis de usuários:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handler para abrir modal de edição
  const handleEditarClick = (u: UsuarioPerfil) => {
    setUserEdicao(u);
    setNomeForm(u.nome);
    setPerfilForm(u.perfil);
    setTurnoForm((u.turno as any) || 'ambos');
    setStatusForm(u.status);
    setErroModal('');
    setModalOpen(true);
  };

  // Ajusta automaticamente o turno sugerido com base no perfil selecionado
  const handlePerfilChange = (novoPerfil: 'admin' | 'manha' | 'tarde' | 'consulta') => {
    setPerfilForm(novoPerfil);
    if (novoPerfil === 'admin') {
      setTurnoForm('ambos');
    } else if (novoPerfil === 'manha') {
      setTurnoForm('manha');
    } else if (novoPerfil === 'tarde') {
      setTurnoForm('tarde');
    }
  };

  const salvarFormulario = async () => {
    if (!userEdicao) return;
    setErroModal('');

    // Validações críticas de integridade
    if (perfilForm === 'admin' && turnoForm !== 'ambos') {
      setErroModal('O perfil de Administrador (admin) exige o turno configurado como "ambos".');
      return;
    }
    if (perfilForm === 'manha' && turnoForm !== 'manha') {
      setErroModal('O perfil de Operador Manhã (manha) exige o turno configurado como "manha".');
      return;
    }
    if (perfilForm === 'tarde' && turnoForm !== 'tarde') {
      setErroModal('O perfil de Operador Tarde (tarde) exige o turno configurado como "tarde".');
      return;
    }

    // Impedir que se auto-desative ou se auto-promova ou desqualifique o próprio perfil de admin logado
    if (userEdicao.id === loggedProfile?.id) {
      if (statusForm === 'inativo') {
        setErroModal('Você não pode inativar seu próprio usuário atual de acesso.');
        return;
      }
      if (perfilForm !== 'admin') {
        setErroModal('Você não pode revogar seu próprio perfil de Administrador (admin).');
        return;
      }
    }

    setSaving(true);
    try {
      const updates = {
        nome: nomeForm.trim(),
        perfil: perfilForm,
        turno: turnoForm,
        status: statusForm,
        pode_cadastrar_prendas: perfilForm === 'admin',
        pode_cadastrar_campanhas: perfilForm === 'admin',
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('usuarios_perfis')
        .update(updates)
        .eq('id', userEdicao.id);

      if (error) throw error;

      // Atualiza lista local de forma eficiente
      setUsuarios(usuarios.map(u => u.id === userEdicao.id ? { ...u, ...updates } : u));
      
      // Exibe toast de sucesso rápido
      setSuccessMsg(`Perfil de ${nomeForm} atualizado com sucesso.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      
      setModalOpen(false);
      setUserEdicao(null);
    } catch (err: any) {
      console.error('Erro ao atualizar usuário no Supabase:', err);
      setErroModal(`Erro ao salvar: ${err.message || 'Verifique as políticas RLS.'}`);
    } finally {
      setSaving(false);
    }
  };

  // Handler para abrir o modal de convite
  const handleOpenInviteModal = () => {
    setInviteNome('');
    setInviteEmail('');
    setInvitePerfil('consulta');
    setInviteTurno('ambos');
    setInviteStatus('ativo');
    setErroInviteModal('');
    setInviteModalOpen(true);
  };

  // Ajusta automaticamente o turno de convite com base no perfil
  const handleInvitePerfilChange = (novoPerfil: 'admin' | 'manha' | 'tarde' | 'consulta') => {
    setInvitePerfil(novoPerfil);
    if (novoPerfil === 'admin') {
      setInviteTurno('ambos');
    } else if (novoPerfil === 'manha') {
      setInviteTurno('manha');
    } else if (novoPerfil === 'tarde') {
      setInviteTurno('tarde');
    }
  };

  const enviarConvite = async () => {
    setErroInviteModal('');
    
    // Validações no frontend
    if (!inviteNome.trim()) {
      setErroInviteModal('O nome do operador é obrigatório.');
      return;
    }
    if (!inviteEmail.trim()) {
      setErroInviteModal('O e-mail para envio do convite é obrigatório.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      setErroInviteModal('Por favor, informe um formato de e-mail válido.');
      return;
    }

    if (invitePerfil === 'admin' && inviteTurno !== 'ambos') {
      setErroInviteModal('O perfil de Administrador exige o turno definido como "ambos".');
      return;
    }
    if (invitePerfil === 'manha' && inviteTurno !== 'manha') {
      setErroInviteModal('O perfil de Operador Manhã exige o turno definido como "manha".');
      return;
    }
    if (invitePerfil === 'tarde' && inviteTurno !== 'tarde') {
      setErroInviteModal('O perfil de Operador Tarde exige o turno definido como "tarde".');
      return;
    }

    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: {
          nome: inviteNome.trim(),
          email: inviteEmail.trim().toLowerCase(),
          perfil: invitePerfil,
          turno: inviteTurno,
          status: inviteStatus
        }
      });

      if (error) {
        let mensagemErro = '';
        try {
          const contextRes = (error as any).context;
          if (contextRes) {
            if (typeof contextRes.clone === 'function') {
              const body = await contextRes.clone().json();
              if (body && body.error) {
                mensagemErro = body.error;
              }
            } else if (typeof contextRes.json === 'function') {
              const body = await contextRes.json();
              if (body && body.error) {
                mensagemErro = body.error;
              }
            }
          }
        } catch (e) {
          console.error('Erro ao ler corpo de erro detalhado:', e);
        }

        throw new Error(mensagemErro || error.message || 'Falha ao processar o convite do usuário.');
      }

      if (data && data.error) {
        throw new Error(data.error);
      }

      // Recarrega lista
      await carregarUsuarios();

      setSuccessMsg(`Convite enviado com sucesso para ${inviteNome}. O e-mail de convite foi disparado pelo Supabase.`);
      setTimeout(() => setSuccessMsg(''), 5000);

      setInviteModalOpen(false);
    } catch (err: any) {
      console.error('Erro ao convidar novo usuário via Edge Function:', err);
      setErroInviteModal(err.message || 'Falha ao processar o convite do usuário. Verifique as credenciais e tente novamente.');
    } finally {
      setInviting(false);
    }
  };

  // Filtragem local
  const usuariosFiltrados = usuarios.filter(u => {
    // Busca por texto
    const txt = busca.toLowerCase();
    const matchesBusca = !busca || 
      u.nome.toLowerCase().includes(txt) || 
      (u.email && u.email.toLowerCase().includes(txt));

    // Filtros de Selects
    const matchesPerfil = filtroPerfil === 'todos' || u.perfil === filtroPerfil;
    const matchesStatus = filtroStatus === 'todos' || u.status === filtroStatus;

    return matchesBusca && matchesPerfil && matchesStatus;
  });

  if (loggedProfile?.perfil !== 'admin') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mb-4 border border-rose-100">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-800">Acesso Restrito ao Administrador</h2>
        <p className="text-slate-500 mt-2 max-w-sm">
          Seu perfil atual ({loggedProfile?.perfil || 'Desconhecido'}) não possui permissões suficientes para gerenciar os perfis de usuários.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Topo Informativo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-indigo-600" />
            Gerenciamento de Usuários e Perfis
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Controle permissões de operadores, turnos de atuação, ativação e inativação de perfis do Supabase Auth.
          </p>
        </div>
        {loggedProfile?.perfil === 'admin' && (
          <button
            onClick={handleOpenInviteModal}
            className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-100 active:scale-95 cursor-pointer max-w-max select-none"
          >
            <UserPlus className="h-4 w-4" />
            Convidar Novo Operador
          </button>
        )}
      </div>

      {/* Box de Notificação Flutuante ou Inline de Sucesso */}
      {successMsg && (
        <div className="bg-emerald-555 bg-emerald-50 border border-emerald-250 p-4 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-bold animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Painel de Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail de usuário..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none transition-all text-slate-800"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap md:flex-nowrap gap-3 items-center">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600">
            <Filter className="h-3 w-3 text-slate-400" />
            <span>Perfil:</span>
            <select
              className="bg-transparent border-none outline-none font-black text-slate-800 cursor-pointer"
              value={filtroPerfil}
              onChange={(e) => setFiltroPerfil(e.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="admin">Administrador</option>
              <option value="manha">Manhã</option>
              <option value="tarde">Tarde</option>
              <option value="consulta">Consulta</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600">
            <UserCheck className="h-3 w-3 text-slate-400" />
            <span>Status:</span>
            <select
              className="bg-transparent border-none outline-none font-black text-slate-800 cursor-pointer"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista Principal de Usuários */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
            <p className="text-xs font-medium">Lendo perfis do banco...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Nome completo</th>
                  <th className="px-6 py-4">Perfil</th>
                  <th className="px-6 py-4">Turno</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Atualizado em</th>
                  <th className="px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {usuariosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-xs">
                      Nenhum perfil de usuário localizado com os critérios informados.
                    </td>
                  </tr>
                ) : (
                  usuariosFiltrados.map((u) => {
                    const perfilBadgeClass = 
                      u.perfil === 'admin' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                      u.perfil === 'manha' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                      u.perfil === 'tarde' ? 'bg-orange-50 border-orange-200 text-orange-700' :
                      'bg-slate-100 border-slate-200 text-slate-700';

                    const statusBadgeClass =
                      u.status === 'ativo' ? 'bg-emerald-50 border-emerald-250 text-emerald-800' :
                      'bg-rose-50 border-rose-250 text-rose-800';

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-black flex items-center justify-center text-xs uppercase select-none">
                              {u.nome.substring(0, 2)}
                            </div>
                            <div>
                              <p className="text-slate-900 font-bold text-sm tracking-tight">{u.nome}</p>
                              {u.email && <p className="text-xs text-slate-400 font-normal">{u.email}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 text-xs border font-bold uppercase tracking-wider rounded-lg ${perfilBadgeClass}`}>
                            {u.perfil}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold capitalize text-slate-600">
                          {u.turno === 'ambos' ? (
                            <span className="inline-flex items-center text-indigo-600 bg-indigo-50/60 border border-indigo-100 px-2 py-0.5 rounded-md">
                              <Clock className="w-3 h-3 mr-1" /> Ambos
                            </span>
                          ) : (
                            u.turno ? u.turno : 'Nenhum'
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs border font-bold capitalize rounded-md ${statusBadgeClass}`}>
                            {u.status === 'ativo' ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400 font-normal">
                          {u.updated_at ? new Date(u.updated_at).toLocaleString('pt-BR') : 'Sem registro'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleEditarClick(u)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer shadow-sm"
                          >
                            <Edit2 className="h-3 w-3" />
                            Editar
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Edição de Perfil */}
      {modalOpen && userEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col p-6 text-slate-800">
            <div className="mb-4">
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5 border-b border-slate-100 pb-3">
                <Edit2 className="h-4 w-4 text-indigo-600" />
                Editar Perfil do Usuário
              </h3>
            </div>

            <div className="space-y-4 py-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Nome Completo
                </label>
                <input
                  type="text"
                  className="w-full p-2.5 bg-slate-100/50 border border-slate-250 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-slate-850 font-semibold"
                  value={nomeForm}
                  onChange={(e) => setNomeForm(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  E-mail de Login (Somente Leitura)
                </label>
                <input
                  type="text"
                  disabled
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-400 font-normal"
                  value={userEdicao.email || 'Não informado'}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Perfil
                  </label>
                  <select
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-semibold"
                    value={perfilForm}
                    onChange={(e: any) => handlePerfilChange(e.target.value)}
                  >
                    <option value="admin">Administrador</option>
                    <option value="manha">Manhã</option>
                    <option value="tarde">Tarde</option>
                    <option value="consulta">Consulta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Turno Relacionado
                  </label>
                  <select
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-semibold capitalize disabled:opacity-50 disabled:bg-slate-100"
                    value={turnoForm}
                    disabled={perfilForm === 'admin' || perfilForm === 'manha' || perfilForm === 'tarde'}
                    onChange={(e: any) => setTurnoForm(e.target.value)}
                  >
                    <option value="manha">manhã</option>
                    <option value="tarde">tarde</option>
                    <option value="ambos">ambos</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Status da Conta
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold select-none">
                    <input
                      type="radio"
                      name="status"
                      className="text-indigo-600 focus:ring-indigo-500"
                      checked={statusForm === 'ativo'}
                      onChange={() => setStatusForm('ativo')}
                    />
                    <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md text-xs font-bold">Ativo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold select-none">
                    <input
                      type="radio"
                      name="status"
                      className="text-indigo-600 focus:ring-indigo-500"
                      checked={statusForm === 'inativo'}
                      onChange={() => setStatusForm('inativo')}
                    />
                    <span className="text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md text-xs font-bold">Inativo</span>
                  </label>
                </div>
              </div>

              {/* Box de Informações de Atividade de Turno automática */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-2xs space-y-1 font-semibold text-slate-500">
                <span className="text-indigo-600 block text-[9.5px] font-black uppercase tracking-wider mb-0.5">Validações Automáticas</span>
                {perfilForm === 'admin' && <p>• O Administrador tem acesso e atuação em ambos os turnos.</p>}
                {perfilForm === 'manha' && <p>• O Operador Manhã opera exclusivamente no turno matinal.</p>}
                {perfilForm === 'tarde' && <p>• O Operador Tarde opera exclusivamente no turno vespertino.</p>}
                {perfilForm === 'consulta' && <p>• Consulta visual de relatórios e ranking liberada conforme o turno selecionado.</p>}
              </div>

              {erroModal && (
                <div className="bg-rose-50 border border-rose-150 p-3 rounded-xl flex items-start gap-2 text-rose-800 text-2xs font-semibold">
                  <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{erroModal}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 border-t border-slate-100 pt-4">
              <button
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl border border-slate-250 text-slate-600 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={salvarFormulario}
                disabled={saving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md shadow-indigo-100 disabled:bg-indigo-400 flex items-center gap-1.5 cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Convite (Fase 2B) */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setInviteModalOpen(false)}
          />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col p-6 text-slate-800">
            <div className="mb-4">
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5 border-b border-slate-100 pb-3">
                <UserPlus className="h-4 w-4 text-indigo-600" />
                Convidar Novo Operador
              </h3>
              <p className="text-slate-500 text-xs font-medium mt-1">
                Envie um convite oficial do Supabase Auth. O perfil de atuação e turno serão cadastrados instantaneamente no banco de dados.
              </p>
            </div>

            <div className="space-y-4 py-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Nome Completo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nome do operador gincana"
                  className="w-full p-2.5 bg-slate-100/50 border border-slate-250 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-slate-850 font-semibold"
                  value={inviteNome}
                  onChange={(e) => setInviteNome(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  E-mail de Login <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="operador@gincana.com"
                  className="w-full p-2.5 bg-slate-100/50 border border-slate-250 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-slate-850 font-semibold"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Perfil
                  </label>
                  <select
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-semibold"
                    value={invitePerfil}
                    onChange={(e: any) => handleInvitePerfilChange(e.target.value)}
                  >
                    <option value="admin">Administrador</option>
                    <option value="manha">Manhã</option>
                    <option value="tarde">Tarde</option>
                    <option value="consulta">Consulta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Turno Relacionado
                  </label>
                  <select
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-semibold capitalize disabled:opacity-50 disabled:bg-slate-100"
                    value={inviteTurno}
                    disabled={invitePerfil === 'admin' || invitePerfil === 'manha' || invitePerfil === 'tarde'}
                    onChange={(e: any) => setInviteTurno(e.target.value)}
                  >
                    <option value="manha">manhã</option>
                    <option value="tarde">tarde</option>
                    <option value="ambos">ambos</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Status Inicial
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold select-none">
                    <input
                      type="radio"
                      name="inviteStatus"
                      className="text-indigo-600 focus:ring-indigo-500"
                      checked={inviteStatus === 'ativo'}
                      onChange={() => setInviteStatus('ativo')}
                    />
                    <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md text-xs font-bold">Ativo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold select-none">
                    <input
                      type="radio"
                      name="inviteStatus"
                      className="text-indigo-600 focus:ring-indigo-500"
                      checked={inviteStatus === 'inativo'}
                      onChange={() => setInviteStatus('inativo')}
                    />
                    <span className="text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md text-xs font-bold">Inativo</span>
                  </label>
                </div>
              </div>

              {/* Box de Informações de Atividade de Turno automática */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-2xs space-y-1 font-semibold text-slate-500">
                <span className="text-indigo-600 block text-[9.5px] font-black uppercase tracking-wider mb-0.5">Regras de Validação</span>
                {invitePerfil === 'admin' && <p>• O perfil admin exige o turno unificado "ambos".</p>}
                {invitePerfil === 'manha' && <p>• O perfil manha exige o turno correspondente "manha".</p>}
                {invitePerfil === 'tarde' && <p>• O perfil tarde exige o turno correspondente "tarde".</p>}
                {invitePerfil === 'consulta' && <p>• O perfil consulta permite flexibilidade de turnos.</p>}
              </div>

              {erroInviteModal && (
                <div className="bg-rose-50 border border-rose-150 p-3 rounded-xl flex items-start gap-2 text-rose-800 text-2xs font-semibold">
                  <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{erroInviteModal}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 border-t border-slate-100 pt-4">
              <button
                onClick={() => setInviteModalOpen(false)}
                disabled={inviting}
                className="px-4 py-2.5 rounded-xl border border-slate-250 text-slate-600 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={enviarConvite}
                disabled={inviting}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md shadow-indigo-100 disabled:bg-indigo-400 flex items-center gap-1.5 cursor-pointer"
              >
                {inviting ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Enviando convite...
                  </>
                ) : (
                  'Convidar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
