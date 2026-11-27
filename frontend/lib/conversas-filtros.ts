/** Tipos e validação de entrada; a filtragem de conteúdo é feita pela API. */
export type ParticipanteConversa = { id: number; nome: string };
export type MensagemConversa = { id: number; texto: string; criada_em: string; autor_id: number; autor_nome: string };
export type ConversaFiltravel = {
  id: number;
  titulo: string;
  criada_em: string;
  atualizada_em: string;
  participantes: ParticipanteConversa[];
  mensagens: MensagemConversa[];
  ultima_mensagem?: string | null;
  proximo_cursor?: string | null;
};
export type FiltrosConversa = {
  palavraChave?: string;
  dataInicio?: string;
  dataFim?: string;
  participanteId?: number | null;
};
export function filtrosValidos(filtros: FiltrosConversa): boolean {
  return !filtros.dataInicio || !filtros.dataFim || filtros.dataInicio <= filtros.dataFim;
}
