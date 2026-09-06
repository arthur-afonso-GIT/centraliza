import type { Profile } from './auth';

export type SegmentoDemanda = 'pendentes' | 'andamento' | 'criticas';
export type DemandaResumo = { id: number; titulo: string; status: 'pendente' | 'em_andamento'; prioridade: 'baixa' | 'media' | 'alta'; prazo: string; critica: boolean; responsavel: { id: number; nome: string } | null };
export type PaginaDemandas = { count: number; next: number | null; previous: number | null; results: DemandaResumo[] };

const FIXTURES: DemandaResumo[] = Array.from({ length: 14 }, (_, index) => ({
  id: index + 1,
  titulo: ['Inspeção em ambiente industrial', 'Apuração de exposição ocupacional', 'Análise de condições ergonômicas', 'Acompanhamento de acidente de trabalho'][index % 4] + ` · ${String(index + 1).padStart(2, '0')}`,
  status: index % 3 === 0 ? 'em_andamento' : 'pendente',
  prioridade: ['alta', 'media', 'baixa'][index % 3] as DemandaResumo['prioridade'],
  prazo: `2026-09-${String(8 + index).padStart(2, '0')}`,
  critica: index % 4 === 0,
  responsavel: index % 5 === 0 ? null : { id: 2, nome: 'Inspetor de demonstração' },
}));

// Adaptador temporário de S2-05. S2-06 substituirá seu corpo pela API.
export async function listarDemandas(segmento: SegmentoDemanda, page: number, perfil: Profile, signal?: AbortSignal): Promise<PaginaDemandas> {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, 300);
    signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Cancelada', 'AbortError')); }, { once: true });
  });
  let permitidas = FIXTURES.filter(item => perfil === 'gestor' || item.responsavel !== null);
  permitidas = permitidas.filter(item => segmento === 'pendentes' ? item.status === 'pendente' : segmento === 'andamento' ? item.status === 'em_andamento' : item.critica);
  const pageSize = 4;
  const start = (page - 1) * pageSize;
  return { count: permitidas.length, previous: page > 1 ? page - 1 : null, next: start + pageSize < permitidas.length ? page + 1 : null, results: permitidas.slice(start, start + pageSize) };
}
