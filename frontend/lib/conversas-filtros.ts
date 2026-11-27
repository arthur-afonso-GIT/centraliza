/** Filtros locais sobre conversas já autorizadas pelo backend. */
export type ParticipanteConversa = { id: number; nome: string };
export type MensagemConversa = { id: number; texto: string; criada_em: string; autor_id: number; autor_nome: string };
export type ConversaFiltravel = {
  id: number;
  titulo: string;
  criada_em: string;
  atualizada_em: string;
  participantes: ParticipanteConversa[];
  mensagens: MensagemConversa[];
  // Opcionais durante a transição de API e para fixtures anteriores à CHAT-03.
  ultima_mensagem_lida_id?: number;
  nao_lidas?: number;
};
export type FiltrosConversa = {
  palavraChave?: string;
  dataInicio?: string;
  dataFim?: string;
  participanteId?: number | null;
};
const normalizar = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();

const dia = (value: string) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(value));
export function filtrosValidos(filtros: FiltrosConversa): boolean {
  return !filtros.dataInicio || !filtros.dataFim || filtros.dataInicio <= filtros.dataFim;
}
export function filtrarConversas(
  conversas: readonly ConversaFiltravel[],
  filtros: FiltrosConversa,
): ConversaFiltravel[] {
  if (!filtrosValidos(filtros)) return [];
  const busca = normalizar(filtros.palavraChave ?? '');
  return conversas.filter((conversa) => {
    const participante = filtros.participanteId;
    if (participante != null &&
        !conversa.participantes.some((p) => p.id === participante)) return false;

    const mensagens = conversa.mensagens ?? [];
    const textos = [conversa.titulo, ...conversa.participantes.map(p => p.nome), ...mensagens.map(m => m.texto)];
    if (busca && !textos.some((texto) => normalizar(texto).includes(busca))) return false;

    if (filtros.dataInicio || filtros.dataFim) {
      const datas = [conversa.criada_em, ...mensagens.map(m => m.criada_em)].map(dia);
      if (!datas.some(d => (!filtros.dataInicio || d >= filtros.dataInicio) &&
                           (!filtros.dataFim || d <= filtros.dataFim))) return false;
    }
    return true;
  });
}
