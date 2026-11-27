import { ApiError, csrfToken } from './auth';
import type { ConversaFiltravel, MensagemConversa, ParticipanteConversa, FiltrosConversa } from './conversas-filtros';

async function resposta<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>;
  const body = await response.json().catch(() => ({})) as Record<string, string | string[]>;
  const first = Object.values(body).find(value => typeof value === 'string' || Array.isArray(value));
  throw new ApiError(response.status, typeof first === 'string' ? first : Array.isArray(first) ? first[0] : 'Não foi possível concluir a operação.');
}

export type Pagina<T> = { resultados: T[]; proximo_cursor: string | null };
export type ConsultaChat = FiltrosConversa & { cursor?: string | null; apos?: number };
function parametros(f: ConsultaChat = {}) {
  const p = new URLSearchParams();
  if (f.palavraChave?.trim()) p.set('palavra', f.palavraChave.trim());
  if (f.dataInicio) p.set('inicio', f.dataInicio);
  if (f.dataFim) p.set('fim', f.dataFim);
  if (f.participanteId) p.set('participante', String(f.participanteId));
  if (f.cursor) p.set('cursor', f.cursor);
  if (f.apos !== undefined) p.set('apos', String(f.apos));
  return p.size ? `?${p}` : '';
}
export async function listarConversas(signal?: AbortSignal, filtros: ConsultaChat = {}) {
  const response = await fetch(`/api/conversas/${parametros(filtros)}`, { credentials: 'same-origin', signal });
  const page = await resposta<Pagina<ConversaFiltravel>>(response);
  return { ...page, resultados: page.resultados.map(c => ({ ...c, mensagens: c.mensagens ?? [] })) };
}

export async function listarMembrosChat(signal?: AbortSignal) {
  const response = await fetch('/api/conversas/membros/', { credentials: 'same-origin', signal });
  return (await resposta<{ resultados: ParticipanteConversa[] }>(response)).resultados;
}

export async function marcarConversaLida(conversaId: number, mensagemId: number) {
  const token = await csrfToken();
  return resposta<{ ultima_mensagem_lida_id: number; nao_lidas?: number }>(await fetch(`/api/conversas/${conversaId}/leitura/`, {
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

export async function obterConversa(conversaId: number, signal?: AbortSignal, consulta: ConsultaChat = {}) {
  return resposta<ConversaFiltravel>(await fetch(`/api/conversas/${conversaId}/${parametros(consulta)}`, { credentials: 'same-origin', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) }));
}

export async function enviarMensagem(conversaId: number, texto: string, clientId: string) {
  const token = await csrfToken();
  return resposta<MensagemConversa>(await fetch(`/api/conversas/${conversaId}/mensagens/`, {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': token },
    body: JSON.stringify({ texto, client_id: clientId }), signal: AbortSignal.timeout(15000),
  }));
}

export type ConversaNotificada = {
  id: number;
  titulo: string;
  nao_lidas: number;
  ultima_mensagem: { id: number; autor_nome: string; criada_em: string };
};
export type NotificacoesChat = { total: number; conversas: ConversaNotificada[] };

// Disparado ao registrar uma leitura, para o contador do menu não esperar a próxima consulta.
export const EVENTO_LEITURA_CHAT = 'centraliza:chat-leitura';

export async function obterNotificacoesChat(signal?: AbortSignal) {
  const response = await fetch('/api/notificacoes/chat/', { credentials: 'same-origin', signal });
  return resposta<NotificacoesChat>(response);
}
