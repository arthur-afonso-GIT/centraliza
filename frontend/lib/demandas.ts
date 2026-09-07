import { ApiError, csrfToken } from './auth';

export type SegmentoDemanda = 'pendentes' | 'andamento' | 'avaliacao' | 'criticas';
export type StatusDemanda = 'pendente' | 'em_andamento' | 'aguardando_avaliacao' | 'em_correcao' | 'concluida' | 'cancelada';
export type DemandaResumo = { id: number; titulo: string; status: StatusDemanda; prioridade: 'baixa' | 'media' | 'alta'; prazo: string; critica: boolean; atrasada: boolean; responsavel: { id: number; nome: string } | null };
export type PaginaDemandas = { count: number; next: string | null; previous: string | null; results: DemandaResumo[] };
export type EventoDemanda = { id: number; tipo: 'demanda_criada' | 'demanda_editada' | 'responsavel_alterado' | 'status_alterado' | 'comentario' | 'anexo_adicionado' | 'anexo_removido'; autor: { id: number; nome: string }; criado_em: string; status_anterior: string; status_novo: string; texto: string };
export type DemandaDetalhe = Omit<DemandaResumo, 'status'> & { status: StatusDemanda; descricao: string; origem: string; criada_em: string; atualizada_em: string; historico: EventoDemanda[] };
export type AnexoDemanda = { id: number; nome_original: string; mime_type: string; tamanho: number; autor: { id: number; nome: string }; criado_em: string; download_url: string };
export type Inspetor = { id: number; nome: string };
export type DadosDemanda = { titulo: string; descricao: string; origem: string; prioridade: 'baixa' | 'media' | 'alta'; prazo: string; critica: boolean; responsavel_id: number | null };
export type FiltrosDemandas = { responsavel: string; prazoDe: string; prazoAte: string; atrasada: boolean };

async function resposta<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>;
  const body = await response.json().catch(() => ({})) as Record<string, string | string[]>;
  const primeira = Object.values(body).find(value => typeof value === 'string' || Array.isArray(value));
  throw new ApiError(response.status, body.detail as string ?? (Array.isArray(primeira) ? primeira[0] : primeira) ?? 'Não foi possível concluir a operação.');
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

export async function listarDemandasParaAgenda(signal?: AbortSignal) {
  const response = await fetch('/api/demandas/?page=1&page_size=50', { credentials: 'same-origin', signal });
  return resposta<PaginaDemandas>(response).then(data => data.results);
}

export async function salvarDemanda(dados: DadosDemanda, id?: number) {
  const token = await csrfToken();
  return resposta<DemandaDetalhe>(await fetch(id ? `/api/demandas/${id}/` : '/api/demandas/', {
    method: id ? 'PATCH' : 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': token },
    body: JSON.stringify(dados),
  }));
}

export async function listarAnexos(id: number, signal?: AbortSignal) {
  return resposta<{ resultados: AnexoDemanda[] }>(await fetch(`/api/demandas/${id}/anexos/`, { credentials: 'same-origin', signal })).then(data => data.resultados);
}

export async function enviarAnexo(id: number, arquivo: File) {
  const token = await csrfToken();
  const data = new FormData();
  data.append('arquivo', arquivo);
  return resposta<AnexoDemanda>(await fetch(`/api/demandas/${id}/anexos/`, {
    method: 'POST', credentials: 'same-origin', headers: { 'X-CSRFToken': token }, body: data,
  }));
}

export async function excluirAnexo(demandaId: number, anexoId: number) {
  const token = await csrfToken();
  const response = await fetch(`/api/demandas/${demandaId}/anexos/${anexoId}/`, {
    method: 'DELETE', credentials: 'same-origin', headers: { 'X-CSRFToken': token },
  });
  if (!response.ok) await resposta<never>(response);
}
