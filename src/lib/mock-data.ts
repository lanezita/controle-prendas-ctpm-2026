// Tipos
import { supabase, isSupabaseConfigured } from './supabaseClient';

export type Perfil = 'admin' | 'manha' | 'tarde' | 'consulta';
export type Turno = 'manha' | 'tarde' | 'ambos';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  turnoVinculado?: Turno;
  podeCadastrarPrendas: boolean;
  podeCadastrarCampanhas: boolean;
  status: 'ativo' | 'inativo';
}

export interface Turma {
  id: string;
  codigo: string;
  nome: string;
  turno: Turno;
  status: 'ativo' | 'inativo';
}

export interface Aluno {
  id: string;
  matricula: string;
  nome: string;
  nome_completo: string;
  turmaId: string;
  codigo_turma: string;
  turma: string;
  ano_serie: string;
  segmento: string;
  turno: Turno;
  pcd: boolean;
  status: 'ativo' | 'inativo';
}

export interface Prenda {
  id: string;
  codigo_prenda: string;
  nome: string;
  nome_prenda: string;
  categoria: string;
  variacao: string;
  pontuacaoBase: number;
  pontuacao_base: number;
  permite_relampago: boolean;
  observacao: string;
  status: 'ativo' | 'inativo';
}

export interface CampanhaRelampago {
  id: string;
  nome: string;
  prendaId: string;
  multiplicador: number;
  dataInicial: string;
  dataFinal: string;
  turnoAplicacao: Turno;
  status: 'ativa' | 'encerrada' | 'cancelada';
  observacao: string;
}

export interface ReciboItem {
  id: string;
  reciboId: string;
  prendaId: string;
  quantidade: number;
  pontuacaoBase: number;
  multiplicadorAplicado: number;
  subtotal: number;
  campanhaAplicada: boolean;
  campanhaRelampagoId?: string;
  
  // Snapshots
  nome_prenda?: string;
  variacao?: string;
  campanha_relampago_aplicada?: 'sim' | 'não';
  nome_campanha?: string;
}

export interface Recibo {
  id: string;
  numero: string;
  dataHora: string;
  alunoId: string;
  turmaId: string;
  turno: Turno;
  total_pontos: number;
  usuarioId: string;
  status: 'ativo' | 'cancelado';
  itens: ReciboItem[]; // Embedded for mock simplicity
  observacao?: string;
  
  // Snapshots
  aluno_nome?: string;
  aluno_matricula?: string;
  aluno_turma?: string;
  aluno_turno?: string;
  usuario_responsavel_nome?: string;
  usuario_responsavel_perfil?: string;

  // Auditoria
  cancelado_por?: string;
  cancelado_em?: string;
  motivo_cancelamento?: string;

  // Status de Sincronizacao
  sincronizado?: boolean;
  offline_id?: string;
}

// Dados Simulados
export const mockUsuarios: Usuario[] = [
  { id: '1', nome: 'Administrador', email: 'admin@escola.com', perfil: 'admin', podeCadastrarPrendas: true, podeCadastrarCampanhas: true, status: 'ativo' },
  { id: '2', nome: 'João (Manhã)', email: 'joao@escola.com', perfil: 'manha', turnoVinculado: 'manha', podeCadastrarPrendas: false, podeCadastrarCampanhas: false, status: 'ativo' },
  { id: '3', nome: 'Maria (Tarde)', email: 'maria@escola.com', perfil: 'tarde', turnoVinculado: 'tarde', podeCadastrarPrendas: false, podeCadastrarCampanhas: false, status: 'ativo' },
];

export const mockTurmas: Turma[] = [
  // Manhã
  { id: 't1', codigo: '11301', nome: '11301', turno: 'manha', status: 'ativo' },
  { id: 't2', codigo: '11302', nome: '11302', turno: 'manha', status: 'ativo' },
  { id: 't3', codigo: '11401', nome: '11401', turno: 'manha', status: 'ativo' },
  { id: 't4', codigo: '11402', nome: '11402', turno: 'manha', status: 'ativo' },
  { id: 't4_3', codigo: '11403', nome: '11403', turno: 'manha', status: 'ativo' },
  { id: 't4_4', codigo: '11404', nome: '11404', turno: 'manha', status: 'ativo' },
  { id: 't5_1', codigo: '11501', nome: '11501', turno: 'manha', status: 'ativo' },
  { id: 't5_2', codigo: '11502', nome: '11502', turno: 'manha', status: 'ativo' },
  { id: 't5', codigo: '11503', nome: '11503', turno: 'manha', status: 'ativo' },
  // Tarde
  { id: 't6', codigo: '12101', nome: '12101', turno: 'tarde', status: 'ativo' },
  { id: 't6_2', codigo: '12102', nome: '12102', turno: 'tarde', status: 'ativo' },
  { id: 't7', codigo: '12103', nome: '12103', turno: 'tarde', status: 'ativo' },
  { id: 't7_4', codigo: '12104', nome: '12104', turno: 'tarde', status: 'ativo' },
  { id: 't8_1', codigo: '12201', nome: '12201', turno: 'tarde', status: 'ativo' },
  { id: 't8_2', codigo: '12202', nome: '12202', turno: 'tarde', status: 'ativo' },
  { id: 't8_3', codigo: '12203', nome: '12203', turno: 'tarde', status: 'ativo' },
  { id: 't8', codigo: '12204', nome: '12204', turno: 'tarde', status: 'ativo' },
  { id: 't9', codigo: '12303', nome: '12303', turno: 'tarde', status: 'ativo' },
  { id: 't10', codigo: '12304', nome: '12304', turno: 'tarde', status: 'ativo' },
];

const mockAlunosDefault: Aluno[] = [
  { id: 'a1', matricula: '20261130101', nome: 'Ana Carolina Silva', nome_completo: 'Ana Carolina Silva', turmaId: 't1', codigo_turma: '11301', turma: '11301', ano_serie: '3º Ano', segmento: 'EFAI', turno: 'manha', pcd: false, status: 'ativo' },
  { id: 'a2', matricula: '20261210301', nome: 'Felipe Martins', nome_completo: 'Felipe Martins', turmaId: 't7', codigo_turma: '12103', turma: '12103', ano_serie: '1º Ano', segmento: 'EFAI', turno: 'tarde', pcd: false, status: 'ativo' },
  { id: 'a3', matricula: '20261230401', nome: 'Eduarda Lima', nome_completo: 'Eduarda Lima', turmaId: 't10', codigo_turma: '12304', turma: '12304', ano_serie: '3º Ano', segmento: 'EFAI', turno: 'tarde', pcd: false, status: 'ativo' },
  { id: 'a4', matricula: '20261130201', nome: 'Bruno Costa', nome_completo: 'Bruno Costa', turmaId: 't2', codigo_turma: '11302', turma: '11302', ano_serie: '3º Ano', segmento: 'EFAI', turno: 'manha', pcd: false, status: 'ativo' },
  { id: 'a5', matricula: '20261220401', nome: 'Camila Santos', nome_completo: 'Camila Santos', turmaId: 't8', codigo_turma: '12204', turma: '12204', ano_serie: '2º Ano', segmento: 'EFAI', turno: 'tarde', pcd: false, status: 'ativo' },
  { id: 'a6', matricula: '153945', nome: 'Clarice Mozelli do Vale', nome_completo: 'Clarice Mozelli do Vale', turmaId: 't7', codigo_turma: '12103', turma: '12103', ano_serie: '1º Ano', segmento: 'EFAI', turno: 'tarde', pcd: false, status: 'ativo' },
];

const mockPrendasDefault: Prenda[] = [
  { id: 'p1', codigo_prenda: 'BR001', nome: 'Amoeba', nome_prenda: 'Amoeba', categoria: 'Brinquedos', variacao: 'Diversas', pontuacaoBase: 200, pontuacao_base: 200, permite_relampago: true, observacao: '', status: 'ativo' },
  { id: 'p2', codigo_prenda: 'BR002', nome: 'Geleca / Massinha Gel / Leleca / Slime', nome_prenda: 'Geleca / Massinha Gel / Leleca / Slime', categoria: 'Brinquedos', variacao: 'Diversas', pontuacaoBase: 100, pontuacao_base: 100, permite_relampago: true, observacao: '', status: 'ativo' },
  { id: 'p3', codigo_prenda: 'BR003', nome: 'Peteca', nome_prenda: 'Peteca', categoria: 'Brinquedos', variacao: 'Diversas', pontuacaoBase: 100, pontuacao_base: 100, permite_relampago: true, observacao: '', status: 'ativo' },
  { id: 'p4', codigo_prenda: 'BR004', nome: 'Pop It / Popped pequeno ou médio', nome_prenda: 'Pop It / Popped pequeno ou médio', categoria: 'Brinquedos', variacao: 'Pequeno/Médio', pontuacaoBase: 100, pontuacao_base: 100, permite_relampago: true, observacao: '', status: 'ativo' },
  { id: 'p5', codigo_prenda: 'BR005', nome: 'Pop It / Popped grande', nome_prenda: 'Pop It / Popped grande', categoria: 'Brinquedos', variacao: 'Grande', pontuacaoBase: 200, pontuacao_base: 200, permite_relampago: true, observacao: '', status: 'ativo' },
  { id: 'p6', codigo_prenda: 'AC001', nome: 'Estojo de maquiagem', nome_prenda: 'Estojo de maquiagem', categoria: 'Acessórios', variacao: 'Diversas', pontuacaoBase: 100, pontuacao_base: 100, permite_relampago: true, observacao: '', status: 'ativo' },
  { id: 'p7', codigo_prenda: 'CS001', nome: 'Kit de pintura facial', nome_prenda: 'Kit de pintura facial', categoria: 'Cosméticos', variacao: 'Diversas', pontuacaoBase: 100, pontuacao_base: 100, permite_relampago: true, observacao: '', status: 'ativo' },
  { id: 'p8', codigo_prenda: 'BR006', nome: 'Carrinhos e bonecos pequenos', nome_prenda: 'Carrinhos e bonecos pequenos', categoria: 'Brinquedos', variacao: 'Pequenos', pontuacaoBase: 50, pontuacao_base: 50, permite_relampago: true, observacao: '', status: 'ativo' },
  { id: 'p9', codigo_prenda: 'BR007', nome: 'Carrinhos e bonecos médios', nome_prenda: 'Carrinhos e bonecos médios', categoria: 'Brinquedos', variacao: 'Médios', pontuacaoBase: 100, pontuacao_base: 100, permite_relampago: true, observacao: '', status: 'ativo' },
  { id: 'p10', codigo_prenda: 'BR008', nome: 'Carrinhos e bonecos grandes', nome_prenda: 'Carrinhos e bonecos grandes', categoria: 'Brinquedos', variacao: 'Grandes', pontuacaoBase: 300, pontuacao_base: 300, permite_relampago: true, observacao: '', status: 'ativo' },
  { id: 'p11', codigo_prenda: 'ES001', nome: 'Corda de pular', nome_prenda: 'Corda de pular', categoria: 'Esportes', variacao: 'Diversas', pontuacaoBase: 100, pontuacao_base: 100, permite_relampago: true, observacao: '', status: 'ativo' },
  { id: 'p12', codigo_prenda: 'ED001', nome: 'Lousinha de madeira ou lousinha mágica', nome_prenda: 'Lousinha de madeira ou lousinha mágica', categoria: 'Educativos', variacao: 'Diversas', pontuacaoBase: 150, pontuacao_base: 150, permite_relampago: true, observacao: '', status: 'ativo' },
];

export function getLocalDataFmt(): string {
  try {
    const formatter = new Intl.DateTimeFormat('fr-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(new Date());
  } catch (e) {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export function isCampanhaVigente(campanha: any): boolean {
  if (!campanha) return false;
  
  const status = (campanha.status || '').toLowerCase();
  if (status !== 'ativa') return false;

  const data_inicio = campanha.data_inicio || campanha.dataInicial;
  const data_fim = campanha.data_fim || campanha.dataFinal;
  
  if (!data_inicio || !data_fim) return false;

  const hoje = getLocalDataFmt();
  
  return hoje >= data_inicio && hoje <= data_fim;
}

const hoje = getLocalDataFmt();

const mockCampanhasDefault: CampanhaRelampago[] = [
  { id: 'c1', nome: 'Dobro no Pop It', prendaId: 'p4', multiplicador: 2, dataInicial: hoje, dataFinal: hoje, turnoAplicacao: 'ambos', status: 'ativa', observacao: 'Pontuação dobrada para Pop It médio/pequeno' },
  { id: 'c2', nome: 'Tarde da Maquiagem', prendaId: 'p6', multiplicador: 3, dataInicial: hoje, dataFinal: hoje, turnoAplicacao: 'tarde', status: 'ativa', observacao: 'Triplo de pontos no estojo de maquiagem hoje!' },
  { id: 'c3', nome: 'Semana da Peteca', prendaId: 'p3', multiplicador: 2, dataInicial: hoje, dataFinal: hoje, turnoAplicacao: 'manha', status: 'ativa', observacao: 'Dobro de pontos para peteca' },
];

const STORAGE_KEY = 'ctpm_mock_recibos_v1';

const defaultRecibos: Recibo[] = [];

const isMockReceipt = (r: Recibo): boolean => {
  const isIdMock = ['r1', 'r2', 'r3'].includes(r.id);
  const isNumMock = ['2026-0001', '2026-0002', '2026-0003'].includes(r.numero);
  const isNameMock = ['Ana Carolina Silva', 'Felipe Martins', 'Eduarda Lima'].includes(r.aluno_nome || '');
  return isIdMock || isNumMock || isNameMock;
};

const getStoredAlunos = (): Aluno[] => {
  if (typeof window === 'undefined') return mockAlunosDefault;
  try {
    const val = localStorage.getItem('ctpm_alunos_v1');
    if (val) return JSON.parse(val);
    localStorage.setItem('ctpm_alunos_v1', JSON.stringify(mockAlunosDefault));
  } catch (e) {
    console.error('Error reading students storage', e);
  }
  return mockAlunosDefault;
};

const getStoredPrendas = (): Prenda[] => {
  if (typeof window === 'undefined') return mockPrendasDefault;
  try {
    const val = localStorage.getItem('ctpm_prendas_v1');
    if (val) return JSON.parse(val);
    localStorage.setItem('ctpm_prendas_v1', JSON.stringify(mockPrendasDefault));
  } catch (e) {
    console.error('Error reading prendas storage', e);
  }
  return mockPrendasDefault;
};

const getStoredCampanhas = (): CampanhaRelampago[] => {
  if (typeof window === 'undefined') return mockCampanhasDefault;
  try {
    const val = localStorage.getItem('ctpm_campanhas_v1');
    if (val) return JSON.parse(val);
    localStorage.setItem('ctpm_campanhas_v1', JSON.stringify(mockCampanhasDefault));
  } catch (e) {
    console.error('Error reading campaigns storage', e);
  }
  return mockCampanhasDefault;
};

const getStoredRecibos = (): Recibo[] => {
  if (typeof window === 'undefined') return [];
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val) {
      const parsed = JSON.parse(val) as Recibo[];
      const filtered = parsed.filter(r => !isMockReceipt(r));
      if (filtered.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      }
      return filtered;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  } catch (e) {
    console.error('Failure reading stored recibos', e);
  }
  return [];
};

export let mockAlunos: Aluno[] = getStoredAlunos();
export let mockPrendas: Prenda[] = getStoredPrendas();
export let mockCampanhas: CampanhaRelampago[] = getStoredCampanhas();
export let mockRecibos: Recibo[] = getStoredRecibos();

export function saveAlunos(updated: Aluno[]) {
  mockAlunos = updated;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('ctpm_alunos_v1', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  }
}

export function savePrendas(updated: Prenda[]) {
  mockPrendas = updated;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('ctpm_prendas_v1', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  }
}

export function saveCampanhas(updated: CampanhaRelampago[]) {
  mockCampanhas = updated;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('ctpm_campanhas_v1', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  }
}

export interface Lancamento {
  id: string;
  numero_recibo: string;
  data_lancamento: string;
  aluno_id: string;
  matricula: string;
  nome_aluno: string;
  turma: string;
  ano_serie: string;
  turno: string;
  prenda_id: string;
  nome_prenda: string;
  tipo_prenda: 'regular' | 'avulsa';
  quantidade: number;
  pontos_base: number;
  prenda_relampago: 'sim' | 'não';
  campanha_relampago_id?: string;
  multiplicador: number;
  total_pontos: number;
  observacao?: string;
  usuario_responsavel: string;
  status: 'valido' | 'cancelado';
  created_at: string;
  updated_at: string;

  // Auditoria de cancelamento
  cancelado_por?: string;
  cancelado_em?: string;
  motivo_cancelamento?: string;

  // Status de Sincronizacao
  sincronizado?: boolean;
}

const getStoredLancamentos = (): Lancamento[] => {
  if (typeof window === 'undefined') return [];
  try {
    const val = localStorage.getItem('ctpm_lancamentos_v1');
    if (val) return JSON.parse(val);
  } catch (e) {
    console.error('Error reading lancamentos storage', e);
  }
  return [];
};

export let mockLancamentos: Lancamento[] = getStoredLancamentos();

export function saveLancamentos(updated: Lancamento[]) {
  mockLancamentos = updated;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('ctpm_lancamentos_v1', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  }
}

export function generateNextReceiptNumber(): string {
  const recibos = getStoredRecibos();
  let maxSeq = 0;
  recibos.forEach(r => {
    // Matches 2026-XXXX or legacy 2026XXXXX
    const cleanNumStr = r.numero.replace('2026-', '').replace('2026', '');
    const num = parseInt(cleanNumStr, 10);
    if (!isNaN(num) && num > maxSeq) {
      maxSeq = num;
    }
  });
  const nextSeq = maxSeq + 1;
  return `2026-${String(nextSeq).padStart(4, '0')}`;
}

export function cancelMockRecibo(reciboId: string, canceladoPor: string, motivo: string) {
  const canceladoEm = new Date().toISOString();

  mockRecibos = mockRecibos.map(r => r.id === reciboId ? { 
    ...r, 
    status: 'cancelado' as const,
    cancelado_por: canceladoPor,
    cancelado_em: canceladoEm,
    motivo_cancelamento: motivo
  } : r);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockRecibos));
    } catch (e) {
      console.error('Failure saving receipts after cancellation', e);
    }
  }

  // Also cancel lancamentos associated with this receipt
  const receipt = mockRecibos.find(r => r.id === reciboId);
  if (receipt) {
    const updatedLancamentos = mockLancamentos.map(l => 
      l.numero_recibo === receipt.numero ? { 
        ...l, 
        status: 'cancelado' as const, 
        cancelado_por: canceladoPor,
        cancelado_em: canceladoEm,
        motivo_cancelamento: motivo,
        updated_at: canceladoEm 
      } : l
    );
    saveLancamentos(updatedLancamentos);
    
    // Also try Supabase cancel if configured
    try {
      supabase.from('lancamentos').update({ 
        status: 'cancelado', 
        cancelado_por: canceladoPor,
        cancelado_em: canceladoEm,
        motivo_cancelamento: motivo,
        updated_at: canceladoEm 
      }).eq('numero_recibo', receipt.numero).then(res => {
        if (res.error) console.error('Supabase cancel lancamento error:', res.error);
      });

      supabase.from('recibos').update({ 
        status: 'cancelado',
        cancelado_por: canceladoPor,
        cancelado_em: canceladoEm,
        motivo_cancelamento: motivo
      }).eq('numero_recibo', receipt.numero).then(res => {
        if (res.error) console.error('Supabase cancel recibo error:', res.error);
      });
    } catch (e) {
      console.warn('Supabase not available for cancel:', e);
    }
  }
}

export async function addMockRecibo(recibo: Omit<Recibo, 'id' | 'numero'>): Promise<Recibo> {
    const isOnline = isSupabaseConfigured && typeof navigator !== 'undefined' && navigator.onLine;

    if (isOnline) {
      // 1. Verificar se há sessão ativa do Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error("Sessão expirada ou inválida no Supabase. Por favor, faça login novamente.");
      }

      // Validar se IDs são UUIDs válidos para evitar quebras de cast no banco
      const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      
      if (!isUUID(recibo.alunoId)) {
        throw new Error('O aluno selecionado é um registro local temporário e não possui um ID válido no Supabase. Busque um aluno online cadastrado para lançar o recibo.');
      }
      if (!isUUID(recibo.usuarioId)) {
        throw new Error('Seu usuário atual não possui um identificador (UUID) de operador válido.');
      }

      try {
        const itensEnvio = (recibo.itens || []).map(item => {
          const isRelampago = item.campanhaAplicada || item.multiplicadorAplicado > 1;
          
          // Sanitização para garantir UUIDs válidos nas relações
          const validPrendaId = isUUID(item.prendaId) ? item.prendaId : null;
          const validCampanhaId = item.campanhaRelampagoId && isUUID(item.campanhaRelampagoId) ? item.campanhaRelampagoId : null;

          return {
            prenda_id: validPrendaId,
            nome_prenda: item.nome_prenda || 'Prenda Avulsa',
            tipo_prenda: item.prendaId === 'avulsa' || !validPrendaId ? 'avulsa' : 'regular',
            quantidade: item.quantidade,
            pontos_base: item.pontuacaoBase,
            prenda_relampago: isRelampago ? 'sim' : 'não',
            multiplicador: item.multiplicadorAplicado,
            total_pontos: item.subtotal,
            campanha_relampago_id: validCampanhaId
          };
        });

        // Chamamos a RPC que processará a inserção de forma transacional e atômica
        const { data, error } = await supabase.rpc('lancar_recibo_transacional', {
          p_aluno_id: recibo.alunoId,
          p_aluno_matricula: recibo.aluno_matricula || '',
          p_aluno_nome: recibo.aluno_nome || '',
          p_aluno_turma: recibo.aluno_turma || '',
          p_turno_aluno: recibo.turno,
          p_total_pontos: recibo.total_pontos,
          p_usuario_id: recibo.usuarioId,
          p_usuario_nome: recibo.usuario_responsavel_nome || 'Operador',
          p_usuario_perfil: recibo.usuario_responsavel_perfil || 'admin',
          p_observacao: recibo.observacao || '',
          p_itens: itensEnvio
        });

        if (error) {
          console.error('Supabase transactional write failed completely:', error);
          throw new Error(error.message || JSON.stringify(error));
        }

        if (data && data.numero_recibo) {
          const nextNum = data.numero_recibo;
          const officialId = data.id || `r_${Date.now()}`;
          
          const newRecibo: Recibo = {
            ...recibo,
            id: officialId,
            numero: nextNum,
            sincronizado: true
          };

          // Salva no mockRecibos local array
          mockRecibos = [newRecibo, ...mockRecibos.filter(r => r.id !== officialId)];
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(mockRecibos));
            } catch (e) {
              console.error('Failure writing stored recibos', e);
            }
          }

          // Trigger a query refresh immediately so stats are based on the latest DB records
          await fetchRecibosFromDB();
          return newRecibo;
        } else {
          throw new Error("O banco de dados não retornou as informações de criação do recibo.");
        }
      } catch (e: any) {
        console.error('Erro detalhado no Supabase:', e);
        throw new Error(e.message || "Não foi possível salvar o recibo no banco de dados. Verifique a conexão e tente novamente.");
      }
    } else {
      // Offline mode sequence
      const tempSeq = generateNextReceiptNumber();
      const newRecibo: Recibo = {
        ...recibo,
        id: `r_off_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        numero: tempSeq,
        sincronizado: false,
        offline_id: `rec_off_${Date.now()}`
      };

      mockRecibos = [newRecibo, ...mockRecibos];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mockRecibos));
        } catch (e) {
          console.error('Failure writing stored recibos', e);
        }
      }

      // Processa lançamentos correspondentes localmente para consistência em cache
      const nextNum = newRecibo.numero;
      const newLancamentosList: Lancamento[] = (recibo.itens || []).map(item => {
        const matchPrenda = mockPrendas.find(p => p.id === item.prendaId);
        const isRelampago = item.campanhaAplicada || item.multiplicadorAplicado > 1;
        
        return {
          id: `lan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          numero_recibo: nextNum,
          data_lancamento: new Date().toISOString().split('T')[0],
          aluno_id: recibo.alunoId,
          matricula: recibo.aluno_matricula || '',
          nome_aluno: recibo.aluno_nome || '',
          turma: recibo.aluno_turma || '',
          ano_serie: 'EFAI',
          turno: recibo.turno,
          prenda_id: item.prendaId,
          nome_prenda: item.nome_prenda || matchPrenda?.nome_prenda || matchPrenda?.nome || 'Prenda Avulsa',
          tipo_prenda: item.prendaId === 'avulsa' ? 'avulsa' : 'regular',
          quantidade: item.quantidade,
          pontos_base: item.pontuacaoBase,
          prenda_relampago: isRelampago ? 'sim' : 'não',
          campanha_relampago_id: item.campanhaRelampagoId || undefined,
          multiplicador: item.multiplicadorAplicado,
          total_pontos: item.subtotal,
          observacao: recibo.observacao,
          usuario_responsavel: recibo.usuario_responsavel_nome || 'Operador',
          status: 'valido',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sincronizado: false
        };
      });

      saveLancamentos([...newLancamentosList, ...mockLancamentos]);
      return newRecibo;
    }
}

// Calculadores Reativos de Estatisticas do Dashboard
export function getDashboardStats(perfil: Perfil, turnoVinculado?: Turno) {
  const activeRecibos = mockRecibos.filter(r => r.status === 'ativo');
  
  // Filtro por turno se não for admin
  const filtered = perfil === 'admin'
    ? activeRecibos
    : activeRecibos.filter(r => r.aluno_turno === turnoVinculado || r.turno === turnoVinculado);

  const total_recibos = filtered.length;
  const total_pontos = filtered.reduce((acc, r) => acc + r.total_pontos, 0);

  // Turma Destaque
  const classPoints: Record<string, { pontos: number; turno: string }> = {};
  filtered.forEach(r => {
    const tId = r.aluno_turma || r.turmaId;
    if (tId) {
      if (!classPoints[tId]) {
        classPoints[tId] = { pontos: 0, turno: r.aluno_turno || r.turno };
      }
      classPoints[tId].pontos += r.total_pontos;
    }
  });

  const highlights = Object.entries(classPoints).map(([codigo, val]) => ({
    codigo,
    pontos: val.pontos,
    turno: val.turno
  }));
  highlights.sort((a, b) => b.pontos - a.pontos);

  const topClass = highlights[0];
  const turmaDestaque = topClass
    ? { nome: topClass.codigo, turno: topClass.turno }
    : { nome: '', turno: '' };

  return {
    total_pontos,
    total_recibos,
    turmaDestaque
  };
}

// Calculadores de Ranking Reativos
export function getRankingAlunos(turnoFilter?: string) {
  const activeRecibos = mockRecibos.filter(r => r.status === 'ativo');
  const filtered = (turnoFilter && turnoFilter !== 'geral')
    ? activeRecibos.filter(r => (r.aluno_turno || r.turno) === turnoFilter)
    : activeRecibos;

  const studentPoints: Record<string, { id: string; nome: string; turma: string; turno: string; pontos: number }> = {};
  filtered.forEach(r => {
    const m = r.aluno_matricula || r.alunoId;
    if (m) {
      if (!studentPoints[m]) {
        studentPoints[m] = {
          id: r.id,
          nome: r.aluno_nome || 'Desconhecido',
          turma: r.aluno_turma || r.turmaId,
          turno: r.aluno_turno || r.turno,
          pontos: 0
        };
      }
      studentPoints[m].pontos += r.total_pontos;
    }
  });

  const list = Object.entries(studentPoints).map(([matricula, s]) => ({
    aluno_id: s.id,
    matricula,
    nome_completo: s.nome,
    codigo_turma: s.turma,
    turno: s.turno,
    total_pontos: s.pontos
  }));

  return list.sort((a, b) => b.total_pontos - a.total_pontos).slice(0, 10);
}

export function getRankingTurmas(turnoFilter?: string) {
  const activeRecibos = mockRecibos.filter(r => r.status === 'ativo');
  const filtered = (turnoFilter && turnoFilter !== 'geral')
    ? activeRecibos.filter(r => (r.aluno_turno || r.turno) === turnoFilter)
    : activeRecibos;

  const classPoints: Record<string, { total_pontos: number; turno: string }> = {};
  filtered.forEach(r => {
    const cCode = r.aluno_turma || r.turmaId;
    if (cCode) {
      const key = `${cCode}`;
      if (!classPoints[key]) {
        classPoints[key] = {
          total_pontos: 0,
          turno: r.aluno_turno || r.turno
        };
      }
      classPoints[key].total_pontos += r.total_pontos;
    }
  });

  const list = Object.entries(classPoints).map(([code, v]) => ({
    codigo_turma: code,
    turno: v.turno,
    total_pontos: v.total_pontos
  }));

  return list.sort((a, b) => b.total_pontos - a.total_pontos);
}

export function getRankingTurnos() {
  const activeRecibos = mockRecibos.filter(r => r.status === 'ativo');
  const turnos = { manha: 0, tarde: 0 };
  activeRecibos.forEach(r => {
    const turno = (r.aluno_turno || r.turno || 'manha').toLowerCase();
    if (turno === 'manha' || turno === 'manhã') {
      turnos.manha += r.total_pontos;
    } else if (turno === 'tarde') {
      turnos.tarde += r.total_pontos;
    }
  });
  return [
    { turno: 'manha', total_pontos: turnos.manha },
    { turno: 'tarde', total_pontos: turnos.tarde }
  ];
}

export interface SolicitacaoCancelamento {
  id: string;
  recibo_id: string;
  numero_recibo: string;
  aluno_nome: string;
  aluno_turma: string;
  aluno_turno: string;
  solicitado_por_id: string;
  solicitado_por_nome: string;
  solicitado_em: string;
  motivo: string;
  status: 'pendente' | 'aprovada' | 'recusada';
  analisado_por_id?: string;
  analisado_por_nome?: string;
  analisado_em?: string;
  observacao_analise?: string;
}

const SOLICITACOES_KEY = 'ctpm_solicitacoes_cancelamento_v1';

const getStoredSolicitacoes = (): SolicitacaoCancelamento[] => {
  if (typeof window === 'undefined') return [];
  try {
    const val = localStorage.getItem(SOLICITACOES_KEY);
    if (val) return JSON.parse(val);
  } catch (e) {
    console.error('Failure reading stored solicitacoes', e);
  }
  return [];
};

export let mockSolicitacoes: SolicitacaoCancelamento[] = getStoredSolicitacoes();

export function saveSolicitacoes(updated: SolicitacaoCancelamento[]) {
  mockSolicitacoes = updated;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SOLICITACOES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failure saving solicitacoes locally', e);
    }
  }
}

export async function addSolicitacaoCancelamento(
  solicitacao: Omit<SolicitacaoCancelamento, 'id' | 'solicitado_em' | 'status'>
): Promise<SolicitacaoCancelamento> {
  const nova: SolicitacaoCancelamento = {
    ...solicitacao,
    id: `sol_off_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    solicitado_em: new Date().toISOString(),
    status: 'pendente'
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('solicitacoes_cancelamento_recibos').insert({
        recibo_id: solicitacao.recibo_id,
        numero_recibo: solicitacao.numero_recibo,
        aluno_nome: solicitacao.aluno_nome,
        aluno_turma: solicitacao.aluno_turma,
        aluno_turno: solicitacao.aluno_turno,
        solicitado_por: solicitacao.solicitado_por_id,
        solicitado_por_nome: solicitacao.solicitado_por_nome,
        motivo: solicitacao.motivo,
        status: 'pendente'
      }).select().single();

      if (!error && data) {
        nova.id = data.id;
      } else {
        console.warn('Falha ao registrar solicitação no Supabase. Gravando localmente.', error);
      }
    } catch (e) {
      console.warn('Erro ao conectar ao Supabase:', e);
    }
  }

  const atualizadas = [nova, ...mockSolicitacoes];
  saveSolicitacoes(atualizadas);
  return nova;
}

export async function processarAnaliseSolicitacao(
  solicitacaoId: string,
  novoStatus: 'aprovada' | 'recusada',
  analisadoPorId: string,
  analisadoPorNome: string,
  observacaoAnalise?: string
): Promise<boolean> {
  const analisadoEm = new Date().toISOString();

  // Procurar no cache
  const sol = mockSolicitacoes.find(s => s.id === solicitacaoId);
  if (!sol) {
    console.error('Solicitação não encontrada');
    return false;
  }

  const atualizadas = mockSolicitacoes.map(s => s.id === solicitacaoId ? {
    ...s,
    status: novoStatus,
    analisado_por_id: analisadoPorId,
    analisado_por_nome: analisadoPorNome,
    analisado_em: analisadoEm,
    observacao_analise: observacaoAnalise
  } : s);
  saveSolicitacoes(atualizadas);

  // Se aprovado, rodar o fluxo regular de cancelamento de recibos (isso recomputará estatísticas no mesmo instante)
  if (novoStatus === 'aprovada') {
    const responsavelCancelamento = analisadoPorId; // O UUID do admin
    const observacaoTexto = observacaoAnalise ? ` | Obs Analista: ${observacaoAnalise}` : '';
    const motivoCompleto = `${sol.motivo}${observacaoTexto}`;
    cancelMockRecibo(sol.recibo_id, responsavelCancelamento, motivoCompleto);
  }

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('solicitacoes_cancelamento_recibos').update({
        status: novoStatus,
        analisado_por: analisadoPorId,
        analisado_por_nome: analisadoPorNome,
        analisado_em: analisadoEm,
        observacao_admin: observacaoAnalise || null
      }).eq('id', solicitacaoId);

      if (error) {
        console.error('Erro de update no Supabase:', error);
      }
    } catch (e) {
      console.warn('Erro ao atualizar solicitação no Supabase:', e);
    }
  }

  return true;
}

export async function fetchSolicitacoesCancelamentoFromDB(): Promise<SolicitacaoCancelamento[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('solicitacoes_cancelamento_recibos')
        .select('*')
        .order('solicitado_em', { ascending: false });

      if (!error && data) {
        const dbSolicitacoes: SolicitacaoCancelamento[] = (data as any[]).map(row => ({
          id: row.id,
          recibo_id: row.recibo_id,
          numero_recibo: row.numero_recibo,
          aluno_nome: row.aluno_nome || '',
          aluno_turma: row.aluno_turma || '',
          aluno_turno: row.aluno_turno || '',
          solicitado_por_id: row.solicitado_por || '',
          solicitado_por_nome: row.solicitado_por_nome || '',
          solicitado_em: row.solicitado_em || '',
          motivo: row.motivo || '',
          status: row.status as 'pendente' | 'aprovada' | 'recusada',
          analisado_por_id: row.analisado_por || undefined,
          analisado_por_nome: row.analisado_por_nome || undefined,
          analisado_em: row.analisado_em || undefined,
          observacao_analise: row.observacao_admin || undefined
        }));
        const dbIds = new Set(dbSolicitacoes.map(s => s.id));
        const merged = [...dbSolicitacoes];

        mockSolicitacoes.forEach(local => {
          if (!dbIds.has(local.id) && local.id.startsWith('sol_off_')) {
            merged.push(local);
          }
        });

        saveSolicitacoes(merged);
        return merged;
      }
    } catch (e) {
      console.warn('Falha na resposta da tabela de solicitações do Supabase:', e);
    }
  }
  return mockSolicitacoes;
}

export function getStoredRecibosOfflineOnly(): Recibo[] {
  const all = getStoredRecibos();
  return all.filter(r => !r.sincronizado || r.id.startsWith('r_off_'));
}

export async function fetchRecibosFromDB(): Promise<Recibo[]> {
  if (isSupabaseConfigured) {
    try {
      // Fetch both receipts and launches (items)
      const { data: dbRecibos, error: recError } = await supabase
        .from('recibos')
        .select('*')
        .order('created_at', { ascending: false });

      if (recError) {
        console.error('Error fetching receipts from Supabase:', recError);
        return mockRecibos;
      }

      const { data: dbLancamentos, error: lancError } = await supabase
        .from('lancamentos')
        .select('*');

      if (lancError) {
        console.error('Error fetching lancamentos from Supabase:', lancError);
      }

      // Group lancamentos by numero_recibo
      const lancamentosMap: Record<string, any[]> = {};
      if (dbLancamentos) {
        dbLancamentos.forEach(l => {
          if (!lancamentosMap[l.numero_recibo]) {
            lancamentosMap[l.numero_recibo] = [];
          }
          lancamentosMap[l.numero_recibo].push(l);
        });
      }

      if (dbRecibos) {
        // Map table rows to Recibo interface
        const mappedRecibos: Recibo[] = dbRecibos.map((row: any) => {
          const itemsFromLancamentos = lancamentosMap[row.numero_recibo] || [];
          const mappedItems: ReciboItem[] = itemsFromLancamentos.map((l: any) => ({
            id: l.id,
            reciboId: row.id,
            prendaId: l.prenda_id || 'avulsa',
            quantidade: l.quantidade,
            pontuacaoBase: l.pontos_base,
            multiplicadorAplicado: l.multiplicador || 1,
            subtotal: l.total_pontos,
            campanhaAplicada: l.prenda_relampago === 'sim' || (l.multiplicador || 1) > 1,
            campanhaRelampagoId: l.campanha_relampago_id,
            nome_prenda: l.nome_prenda,
            variacao: l.tipo_prenda === 'avulsa' ? 'Avulsa' : 'Regular'
          }));

          return {
            id: row.id,
            numero: row.numero_recibo,
            dataHora: row.created_at || row.data_geracao || new Date().toISOString(),
            alunoId: row.aluno_id || '',
            turmaId: row.aluno_turma || '',
            turno: row.aluno_turno as 'manha' | 'tarde',
            total_pontos: row.total_pontos || 0,
            usuarioId: row.usuario_id || '',
            status: row.status as 'ativo' | 'cancelado',
            itens: mappedItems,
            observacao: row.observacao,
            aluno_nome: row.aluno_nome,
            aluno_matricula: row.aluno_matricula,
            aluno_turma: row.aluno_turma,
            aluno_turno: row.aluno_turno,
            usuario_responsavel_nome: row.usuario_responsavel_nome,
            usuario_responsavel_perfil: row.usuario_responsavel_perfil,
            cancelado_por: row.cancelado_por,
            cancelado_em: row.cancelado_em,
            motivo_cancelamento: row.motivo_cancelamento,
            sincronizado: true
          };
        });

        // Filter and keep only real offline receipts from local cache (Rule 7 & 8)
        const localOfflineOnly = getStoredRecibosOfflineOnly();

        const merged = [...mappedRecibos, ...localOfflineOnly];
        
        // Let's sort to keep consistent sequence (by parsed number or date desc)
        merged.sort((a, b) => b.numero.localeCompare(a.numero));

        // Reassign the export variable so that other pages (like Ranking) can read it reactively
        mockRecibos = merged;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch (e) {
          console.error(e);
        }
        
        return merged;
      }
    } catch (e) {
      console.warn('Erro fetchRecibosFromDB:', e);
    }
  }

  return mockRecibos;
}
