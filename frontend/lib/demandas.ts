import { ApiError, csrfToken } from './auth';

export type SegmentoDemanda = 'pendentes' | 'andamento' | 'criticas';
export type StatusDemanda = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
export type DemandaResumo = { id: number; titulo: string; status: 'pendente' | 'em_andamento'; prioridade: 'baixa' | 'media' | 'alta'; prazo: string; critica: boolean; responsavel: { id: number; nome: string } | null };
export type PaginaDemandas = { count: number; next: string | null; previous: string | null; results: DemandaResumo[] };
export type EventoDemanda = { id: number; tipo: 'status_alterado' | 'comentario'; autor: { id: number; nome: string }; criado_em: string; status_anterior: string; status_novo: string; texto: string };
export type DemandaDetalhe = Omit<DemandaResumo, 'status'> & { status: StatusDemanda; descricao: string; criada_em: string; atualizada_em: string; historico: EventoDemanda[] };

async function resposta<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>;
  const body = await response.json().catch(() => ({})) as { detail?: string; status?: string[] };
  throw new ApiError(response.status, body.detail ?? body.status?.[0] ?? 'Não foi possível concluir a operação.');
}

export async function listarDemandas(segmento: SegmentoDemanda, page: number, signal?: AbortSignal): Promise<PaginaDemandas> {
  const filter = segmento === 'pendentes' ? 'status=pendente' : segmento === 'andamento' ? 'status=em_andamento' : 'critica=true';
  const response = await fetch(`/api/demandas/?${filter}&page=${page}&page_size=4`, { credentials: 'same-origin', signal });
  return resposta<PaginaDemandas>(response);
}

export async function obterDemanda(id: number, signal?: AbortSignal) {
  return resposta<DemandaDetalhe>(await fetch(`/api/demandas/${id}/`, { credentials: 'same-origin', signal }));
}

export async function alterarStatus(id: number, status: 'em_andamento' | 'concluida') {
  const token = await csrfToken();
  return resposta<DemandaDetalhe>(await fetch(`/api/demandas/${id}/status/`, {
    method: 'PATCH', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': token },
    body: JSON.stringify({ status }),
  }));
}

export async function adicionarComentario(id: number, texto: string) {
  const token = await csrfToken();
  return resposta<EventoDemanda>(await fetch(`/api/demandas/${id}/historico/`, {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': token },
    body: JSON.stringify({ texto }),
  }));
}
