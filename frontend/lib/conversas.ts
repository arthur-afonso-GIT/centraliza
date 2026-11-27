import { ApiError, csrfToken } from './auth';
import type { ConversaFiltravel, MensagemConversa, ParticipanteConversa } from './conversas-filtros';

async function resposta<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>;
  const body = await response.json().catch(() => ({})) as Record<string, string | string[]>;
  const first = Object.values(body).find(value => typeof value === 'string' || Array.isArray(value));
  throw new ApiError(response.status, typeof first === 'string' ? first : Array.isArray(first) ? first[0] : 'Não foi possível concluir a operação.');
}

export async function listarConversas(signal?: AbortSignal) {
  const response = await fetch('/api/conversas/', { credentials: 'same-origin', signal });
  return (await resposta<{ resultados: ConversaFiltravel[] }>(response)).resultados;
}

export async function listarMembrosChat(signal?: AbortSignal) {
  const response = await fetch('/api/conversas/membros/', { credentials: 'same-origin', signal });
  return (await resposta<{ resultados: ParticipanteConversa[] }>(response)).resultados;
}

export async function marcarConversaLida(conversaId: number, mensagemId: number) {
  const token = await csrfToken();
  return resposta<{ ultima_mensagem_lida_id: number }>(await fetch(`/api/conversas/${conversaId}/leitura/`, {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': token },
    body: JSON.stringify({ mensagem_id: mensagemId }),
  }));
}

export async function criarConversa(titulo: string, participanteIds: number[]) {
  const token = await csrfToken();
  return resposta<ConversaFiltravel>(await fetch('/api/conversas/', {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': token },
    body: JSON.stringify({ titulo, participante_ids: participanteIds }),
  }));
}

export async function obterConversa(conversaId: number, signal?: AbortSignal) {
  return resposta<ConversaFiltravel>(await fetch(`/api/conversas/${conversaId}/`, { credentials: 'same-origin', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) }));
}

export async function enviarMensagem(conversaId: number, texto: string, clientId: string) {
  const token = await csrfToken();
  return resposta<MensagemConversa>(await fetch(`/api/conversas/${conversaId}/mensagens/`, {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': token },
    body: JSON.stringify({ texto, client_id: clientId }), signal: AbortSignal.timeout(15000),
  }));
}
