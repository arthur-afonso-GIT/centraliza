import { ApiError } from './auth';

export type CategoriaAviso = 'urgente' | 'informativo';
export type AvisoFeed = { id: number; titulo: string; resumo: string; categoria: CategoriaAviso; autor: string; publicado_em: string };
export type AvisoDetalhe = AvisoFeed & { conteudo: string };

async function resposta<T>(response: Response, message: string): Promise<T> {
  if (!response.ok) throw new ApiError(response.status, message);
  return response.json() as Promise<T>;
}

export async function listarAvisos(signal?: AbortSignal) {
  const data = await resposta<{ resultados: AvisoFeed[] }>(await fetch('/api/avisos/', { credentials: 'same-origin', signal }), 'Não foi possível carregar os avisos.');
  return data.resultados;
}

export function obterAviso(id: number, signal?: AbortSignal) {
  return fetch(`/api/avisos/${id}/`, { credentials: 'same-origin', signal }).then(response => resposta<AvisoDetalhe>(response, 'Não foi possível carregar o aviso.'));
}
