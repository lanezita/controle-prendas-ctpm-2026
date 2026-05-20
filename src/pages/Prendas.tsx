import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Search, Gift, Tag } from 'lucide-react';
import { formatPoints } from '../lib/utils';

interface Prenda {
  id: string;
  nome_prenda: string;
  categoria?: string;
  variacao?: string;
  pontuacao_base: number;
  status: string;
}

export function Prendas() {
  const [prendas, setPrendas] = useState<Prenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPrendas();
  }, []);

  const fetchPrendas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prendas')
        .select('*')
        .eq('status', 'ativo')
        .order('nome_prenda', { ascending: true });

      if (error) throw error;
      setPrendas(data || []);
    } catch (err) {
      console.error('Erro ao buscar prendas:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPrendas = prendas.filter(p => 
    p.nome_prenda.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.variacao && p.variacao.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.categoria && p.categoria.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Prendas</h1>
          <p className="text-slate-500">Lista de prendas ativas e suas pontuações base.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome ou categoria..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-8 text-center text-slate-400 uppercase text-xs tracking-widest font-bold">
              Carregando prendas...
            </div>
          ) : filteredPrendas.length > 0 ? (
            filteredPrendas.map((prenda) => (
              <div key={prenda.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-4">
                <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 text-slate-900">
                  <Gift className="w-6 h-6 text-slate-700" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 leading-tight mb-0.5">{prenda.nome_prenda}</h3>
                  {prenda.variacao && (
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1.5">{prenda.variacao}</p>
                  )}
                  {prenda.categoria && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-2">
                      <Tag className="w-3 h-3" />
                      {prenda.categoria}
                    </div>
                  )}
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
    </div>
  );
}
