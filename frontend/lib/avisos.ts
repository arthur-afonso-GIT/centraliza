import { ApiError, csrfToken } from './auth';

export type CategoriaAviso = 'urgente' | 'informativo';
export type AvisoFeed = { id: number; titulo: string; resumo: string; categoria: CategoriaAviso; autor: string; publicado_em: string; expira_em: string | null; destinatarios: Array<{ id: number; nome: string }> };
export type AvisoDetalhe = AvisoFeed & { conteudo: string };
export type DadosAviso = { titulo: string; resumo: string; conteudo: string; categoria: CategoriaAviso; publicado_em: string; expira_em: string | null; destinatario_ids: number[] };

async function resposta<T>(response: Response, message: string): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as Record<string, string | string[]>;
    const field = Object.values(body).find(Array.isArray) as string[] | undefined;
    throw new ApiError(response.status, body.detail as string ?? field?.[0] ?? message);
  }
  return response.json() as Promise<T>;
}

export async function listarAvisos(signal?: AbortSignal) {
  const data = await resposta<{ resultados: AvisoFeed[] }>(await fetch('/api/avisos/', { credentials: 'same-origin', signal }), 'Não foi possível carregar os avisos.');
  return data.resultados;
}

export function obterAviso(id: number, signal?: AbortSignal) {
  return fetch(`/api/avisos/${id}/`, { credentials: 'same-origin', signal }).then(response => resposta<AvisoDetalhe>(response, 'Não foi possível carregar o aviso.'));
}

export async function salvarAviso(dados: DadosAviso, id?: number) {
  const token = await csrfToken();
  return resposta<AvisoDetalhe>(await fetch(id ? `/api/avisos/${id}/` : '/api/avisos/', {
    method: id ? 'PATCH' : 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': token }, body: JSON.stringify(dados),
  }), 'Não foi possível salvar o aviso.');
}

export async function cancelarAviso(id: number) {
  const token = await csrfToken();
  const response = await fetch(`/api/avisos/${id}/`, { method: 'DELETE', credentials: 'same-origin', headers: { 'X-CSRFToken': token } });
  if (!response.ok) throw new ApiError(response.status, 'Não foi possível cancelar o aviso.');
}
