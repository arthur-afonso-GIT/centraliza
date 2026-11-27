'use client';
import { useMemo } from 'react';
import { filtrosValidos, type FiltrosConversa, type ParticipanteConversa, type ConversaFiltravel } from '../lib/conversas-filtros';

type Props = { conversas: ConversaFiltravel[]; selecionada: number | null; onSelecionar: (id: number) => void; filtros: FiltrosConversa; onFiltros: (f: FiltrosConversa) => void; membros: ParticipanteConversa[]; carregando: boolean };
export default function ConversasFiltros({ conversas, selecionada, onSelecionar, filtros, onFiltros, membros, carregando }: Props) {
  const { palavraChave = '', dataInicio = '', dataFim = '', participanteId = null } = filtros;
  const participantes = useMemo(() => [...new Map([...membros, ...conversas.flatMap(c => c.participantes)].map(p => [p.id, p])).values()].sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR')), [membros, conversas]);
  const datasValidas = filtrosValidos(filtros);
  const filtradas = datasValidas ? conversas : [];
  function limpar() {
    onFiltros({});
  }
  return <section aria-label="Pesquisa de conversas" className="conversa-filtros">
    <div className="conversa-filtros-campos">
      <label>Palavra-chave
        <input type="search" value={palavraChave} onChange={e => onFiltros({ ...filtros, palavraChave: e.target.value })}
          placeholder="Título, participantes ou mensagens" />
      </label>
      <label>De
        <input type="date" value={dataInicio} onChange={e => onFiltros({ ...filtros, dataInicio: e.target.value })} />
      </label>
      <label>Até
        <input type="date" value={dataFim} onChange={e => onFiltros({ ...filtros, dataFim: e.target.value })} min={dataInicio || undefined} />
      </label>
      <label>Participante
        <select value={participanteId ?? ''} onChange={e => onFiltros({ ...filtros, participanteId: e.target.value ? Number(e.target.value) : null })}>
          <option value="">Todos</option>
          {participantes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </label>
      <button type="button" className="secondary" onClick={limpar}>Limpar filtros</button>
    </div>
    {!datasValidas && <p role="alert">A data inicial não pode ser posterior à data final.</p>}
    {carregando && <output>Pesquisando conversas…</output>}
    <p aria-live="polite">{filtradas.length} conversa{filtradas.length === 1 ? '' : 's'} carregada{filtradas.length === 1 ? '' : 's'}</p>
    {!filtradas.length ? <div className="empty-state"><h2>Nenhuma conversa encontrada</h2>
      <p>{conversas.length ? 'Experimente ajustar os filtros.' : 'Ainda não há conversas disponíveis.'}</p>
    </div> : <ul className="conversa-resultados">
      {filtradas.map(c => <li key={c.id}>
        <button type="button" className={selecionada === c.id ? 'is-selected' : ''} aria-current={selecionada === c.id ? 'true' : undefined} onClick={() => onSelecionar(c.id)}>
          <strong>{c.titulo}</strong>
          {(c.nao_lidas ?? 0) > 0 && <strong className="conversa-nao-lidas">{c.nao_lidas} {c.nao_lidas === 1 ? 'mensagem não lida' : 'mensagens não lidas'}</strong>}
          <small>{c.participantes.map(p => p.nome).join(', ')}</small>
          <span>{c.ultima_mensagem ?? c.mensagens.at(-1)?.texto ?? 'Nenhuma mensagem ainda'}</span>
        </button>
      </li>)}
    </ul>}
  </section>;
}
