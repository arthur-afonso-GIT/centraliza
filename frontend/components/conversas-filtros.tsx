'use client';
import { useMemo, useState } from 'react';
import { filtrarConversas, filtrosValidos, type ConversaFiltravel } from '../lib/conversas-filtros';

type Props = { conversas: ConversaFiltravel[]; selecionada: number | null; onSelecionar: (id: number) => void };
export default function ConversasFiltros({ conversas, selecionada, onSelecionar }: Props) {
  const [palavraChave, setPalavraChave] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [participanteId, setParticipanteId] = useState('');
  const participantes = useMemo(() =>
    [...new Map(conversas.flatMap(c => c.participantes).map(p => [p.id, p])).values()]
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')), [conversas]);
  const filtros = { palavraChave, dataInicio, dataFim, participanteId: participanteId ? Number(participanteId) : null };
  const datasValidas = filtrosValidos(filtros);
  const filtradas = filtrarConversas(conversas, filtros);
  function limpar() {
    setPalavraChave(''); setDataInicio(''); setDataFim(''); setParticipanteId('');
  }
  return <section aria-label="Pesquisa de conversas" className="conversa-filtros">
    <div className="conversa-filtros-campos">
      <label>Palavra-chave
        <input type="search" value={palavraChave} onChange={e => setPalavraChave(e.target.value)}
          placeholder="Título, participantes ou mensagens" />
      </label>
      <label>De
        <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
      </label>
      <label>Até
        <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} min={dataInicio || undefined} />
      </label>
      <label>Participante
        <select value={participanteId} onChange={e => setParticipanteId(e.target.value)}>
          <option value="">Todos</option>
          {participantes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </label>
      <button type="button" className="secondary" onClick={limpar}>Limpar filtros</button>
    </div>
    {!datasValidas && <p role="alert">A data inicial não pode ser posterior à data final.</p>}
    <p aria-live="polite">{filtradas.length} conversa{filtradas.length === 1 ? '' : 's'} encontrada{filtradas.length === 1 ? '' : 's'}</p>
    {!filtradas.length ? <div className="empty-state"><h2>Nenhuma conversa encontrada</h2>
      <p>{conversas.length ? 'Experimente ajustar os filtros.' : 'Ainda não há conversas disponíveis.'}</p>
    </div> : <ul className="conversa-resultados">
      {filtradas.map(c => <li key={c.id}>
        <button type="button" className={selecionada === c.id ? 'is-selected' : ''} aria-current={selecionada === c.id ? 'true' : undefined} onClick={() => onSelecionar(c.id)}>
          <strong>{c.titulo}</strong>
          <small>{c.participantes.map(p => p.nome).join(', ')}</small>
          <span>{c.mensagens.at(-1)?.texto ?? 'Nenhuma mensagem ainda'}</span>
        </button>
      </li>)}
    </ul>}
  </section>;
}
