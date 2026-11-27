import type { ConversaFiltravel } from './conversas-filtros';

export function aplicarLeitura(conversa: ConversaFiltravel, cursor: number, usuarioId: number, naoLidas?: number): ConversaFiltravel {
  if (cursor < (conversa.ultima_mensagem_lida_id ?? 0)) return conversa;
  if (naoLidas !== undefined) return { ...conversa, ultima_mensagem_lida_id: cursor, nao_lidas: naoLidas };
  if (cursor === (conversa.ultima_mensagem_lida_id ?? 0)) return conversa;
  // A página não contém todo o histórico: nunca contar apenas as mensagens carregadas.
  const anterior = conversa.ultima_mensagem_lida_id ?? 0;
  const lidasNestaPagina = conversa.mensagens.filter(m => m.id > anterior && m.id <= cursor && m.autor_id !== usuarioId).length;
  return {
    ...conversa,
    ultima_mensagem_lida_id: cursor,
    nao_lidas: Math.max(0, (conversa.nao_lidas ?? conversa.mensagens.filter(m => m.id > anterior && m.autor_id !== usuarioId).length) - lidasNestaPagina),
  };
}

export function conciliarLeituras(anteriores: ConversaFiltravel[] | null, novas: ConversaFiltravel[], usuarioId: number) {
  const cursores = new Map(anteriores?.map(c => [c.id, c.ultima_mensagem_lida_id ?? 0]));
  return novas.map(c => aplicarLeitura(c, cursores.get(c.id) ?? 0, usuarioId));
}
