export type SegmentoDemanda = 'pendentes' | 'andamento' | 'criticas';
export type DemandaResumo = { id: number; titulo: string; status: 'pendente' | 'em_andamento'; prioridade: 'baixa' | 'media' | 'alta'; prazo: string; critica: boolean; responsavel: { id: number; nome: string } | null };
export type PaginaDemandas = { count: number; next: string | null; previous: string | null; results: DemandaResumo[] };

export async function listarDemandas(segmento: SegmentoDemanda, page: number, signal?: AbortSignal): Promise<PaginaDemandas> {
  const filter = segmento === 'pendentes' ? 'status=pendente' : segmento === 'andamento' ? 'status=em_andamento' : 'critica=true';
  const response = await fetch(`/api/demandas/?${filter}&page=${page}&page_size=4`, { credentials: 'same-origin', signal });
  if (!response.ok) {
    const error = new Error('Não foi possível carregar as demandas.') as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  return response.json() as Promise<PaginaDemandas>;
}
