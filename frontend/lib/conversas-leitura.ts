import type { ConversaFiltravel } from './conversas-filtros';

export function aplicarLeitura(conversa: ConversaFiltravel, cursor: number, usuarioId: number): ConversaFiltravel {
  if (cursor <= (conversa.ultima_mensagem_lida_id ?? 0)) return conversa;
  return {
    ...conversa,
    ultima_mensagem_lida_id: cursor,
    nao_lidas: conversa.mensagens.filter(m => m.id > cursor && m.autor_id !== usuarioId).length,
  };
}

export function conciliarLeituras(anteriores: ConversaFiltravel[] | null, novas: ConversaFiltravel[], usuarioId: number) {
  const cursores = new Map(anteriores?.map(c => [c.id, c.ultima_mensagem_lida_id ?? 0]));
  return novas.map(c => aplicarLeitura(c, cursores.get(c.id) ?? 0, usuarioId));
}
