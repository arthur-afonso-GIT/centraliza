import { ApiError, csrfToken } from './auth';

export type SegmentoDemanda = 'pendentes' | 'andamento' | 'avaliacao' | 'criticas';
export type StatusDemanda = 'pendente' | 'em_andamento' | 'aguardando_avaliacao' | 'em_correcao' | 'concluida' | 'cancelada';
export type DemandaResumo = { id: number; titulo: string; status: StatusDemanda; prioridade: 'baixa' | 'media' | 'alta'; prazo: string; critica: boolean; atrasada: boolean; responsavel: { id: number; nome: string } | null };
export type PaginaDemandas = { count: number; next: string | null; previous: string | null; results: DemandaResumo[] };
export type EventoDemanda = { id: number; tipo: 'demanda_criada' | 'demanda_editada' | 'responsavel_alterado' | 'status_alterado' | 'comentario'; autor: { id: number; nome: string }; criado_em: string; status_anterior: string; status_novo: string; texto: string };
export type DemandaDetalhe = Omit<DemandaResumo, 'status'> & { status: StatusDemanda; descricao: string; origem: string; criada_em: string; atualizada_em: string; historico: EventoDemanda[] };
export type Inspetor = { id: number; nome: string };
export type DadosDemanda = { titulo: string; descricao: string; origem: string; prioridade: 'baixa' | 'media' | 'alta'; prazo: string; critica: boolean; responsavel_id: number | null };
export type FiltrosDemandas = { responsavel: string; prazoDe: string; prazoAte: string; atrasada: boolean };

async function resposta<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>;
  const body = await response.json().catch(() => ({})) as { detail?: string; status?: string[]; texto?: string[] };
  throw new ApiError(response.status, body.detail ?? body.status?.[0] ?? body.texto?.[0] ?? 'Não foi possível concluir a operação.');
}

export async function listarDemandas(segmento: SegmentoDemanda, page: number, filtros?: FiltrosDemandas, signal?: AbortSignal): Promise<PaginaDemandas> {
  const query = new URLSearchParams(segmento === 'pendentes' ? { status: 'pendente' } : segmento === 'andamento' ? { status: 'em_andamento' } : segmento === 'avaliacao' ? { status: 'aguardando_avaliacao' } : { critica: 'true' });
  query.set('page', String(page)); query.set('page_size', '4');
  if (filtros?.responsavel) query.set('responsavel', filtros.responsavel);
  if (filtros?.prazoDe) query.set('prazo_de', filtros.prazoDe);
  if (filtros?.prazoAte) query.set('prazo_ate', filtros.prazoAte);
  if (filtros?.atrasada) query.set('atrasada', 'true');
  const response = await fetch(`/api/demandas/?${query}`, { credentials: 'same-origin', signal });
  return resposta<PaginaDemandas>(response);
}

export async function obterDemanda(id: number, signal?: AbortSignal) {
  return resposta<DemandaDetalhe>(await fetch(`/api/demandas/${id}/`, { credentials: 'same-origin', signal }));
}

export async function alterarStatus(id: number, status: StatusDemanda, texto = '') {
  const token = await csrfToken();
  return resposta<DemandaDetalhe>(await fetch(`/api/demandas/${id}/status/`, {
    method: 'PATCH', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': token },
    body: JSON.stringify({ status, texto }),
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

export async function listarInspetores(signal?: AbortSignal) {
  const response = await fetch('/api/usuarios/inspetores/', { credentials: 'same-origin', signal });
  return resposta<{ resultados: Inspetor[] }>(response).then(data => data.resultados);
}

export async function salvarDemanda(dados: DadosDemanda, id?: number) {
  const token = await csrfToken();
  return resposta<DemandaDetalhe>(await fetch(id ? `/api/demandas/${id}/` : '/api/demandas/', {
    method: id ? 'PATCH' : 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': token },
    body: JSON.stringify(dados),
  }));
}
