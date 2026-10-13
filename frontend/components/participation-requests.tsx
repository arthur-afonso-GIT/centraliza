'use client';
import { useEffect, useState } from 'react';
import { ApiError } from '../lib/auth';
import { decidirParticipacao, listarSolicitacoes, type SolicitacaoParticipacao } from '../lib/demandas';

export default function ParticipationRequests() {
  const [received, setReceived] = useState<SolicitacaoParticipacao[]>([]);
  const [mine, setMine] = useState<SolicitacaoParticipacao[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    function load() {
      Promise.all([listarSolicitacoes('recebidas', controller.signal), listarSolicitacoes('minhas', controller.signal)])
        .then(([incoming, outgoing]) => { setReceived(incoming); setMine(outgoing); })
        .catch(reason => { if (!(reason instanceof DOMException && reason.name === 'AbortError')) setError('Não foi possível carregar as solicitações.'); });
    }
    load();
    window.addEventListener('centraliza:participacao-solicitada', load);
    return () => { controller.abort(); window.removeEventListener('centraliza:participacao-solicitada', load); };
  }, []);

  async function decide(id: number, decisao: 'aprovar' | 'recusar') {
    setBusyId(id); setError('');
    try {
      await decidirParticipacao(id, decisao);
      setReceived(current => current.filter(item => item.id !== id));
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Não foi possível decidir a solicitação.');
    } finally { setBusyId(null); }
  }

  if (!received.length && !mine.length && !error) return null;
  return <section className="participation-requests" aria-labelledby="pedidos-participacao">
    <h2 id="pedidos-participacao">Participação entre equipes</h2>
    {error && <p role="alert">{error}</p>}
    {received.length > 0 && <div><h3>Pedidos para avaliar</h3><ul>{received.map(item => <li key={item.id}>
      <div><strong>{item.equipe.nome}</strong> solicita acesso a <strong>{item.demanda.titulo}</strong><small>SEI {item.demanda.sei_numero} · Solicitado por {item.solicitante.nome}</small></div>
      <div className="participation-actions"><button type="button" className="primary" disabled={busyId === item.id} onClick={() => decide(item.id, 'aprovar')}>Aprovar</button><button type="button" className="secondary" disabled={busyId === item.id} onClick={() => decide(item.id, 'recusar')}>Recusar</button></div>
    </li>)}</ul></div>}
    {mine.length > 0 && <div><h3>Pedidos da sua equipe</h3><ul>{mine.map(item => <li key={item.id}><div><strong>{item.demanda.titulo}</strong><small>SEI {item.demanda.sei_numero} · {item.demanda.origem || 'Demandante não informado'}</small></div><span>{item.status === 'pendente' ? 'Aguardando decisão' : item.status === 'aprovada' ? 'Aprovada' : 'Recusada'}</span></li>)}</ul></div>}
  </section>;
}
