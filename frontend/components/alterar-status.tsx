'use client';
import { useState, type SyntheticEvent } from 'react';
import { alterarStatus, type DemandaDetalhe, type StatusDemanda } from '../lib/demandas';

const statusLabel: Record<string, string> = { pendente: 'Aguardando aceite', aceita: 'Aceita', em_andamento: 'Em andamento', aguardando_avaliacao: 'Aguardando avaliação', em_correcao: 'Em correção', concluida: 'Concluída', cancelada: 'Cancelada' };

export default function AlterarStatus({ demanda, onSaved }: { demanda: DemandaDetalhe; onSaved: (item: DemandaDetalhe, text: string) => void }) {
  const opcoes = demanda.status_disponiveis;
  const [status, setStatus] = useState<StatusDemanda | ''>(opcoes[0]?.status ?? '');
  const [texto, setTexto] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const escolhida = opcoes.find(item => item.status === status);
  const faltaTexto = Boolean(escolhida?.exige_texto && !texto.trim());
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !escolhida || faltaTexto) return;
    setBusy(true); setError('');
    try { onSaved(await alterarStatus(demanda.id, escolhida.status, escolhida.exige_texto ? texto : ''), `Status alterado para ${statusLabel[escolhida.status]}.`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível alterar o status.'); }
    finally { setBusy(false); }
  }
  return <section className="detail-card" aria-labelledby="titulo-status">
    <h2 id="titulo-status">Status da demanda</h2>
    <form className="demand-form" onSubmit={submit}>
      <p>Situação atual: <strong>{statusLabel[demanda.status]}</strong></p>
      <label htmlFor="novo-status">Novo status<select id="novo-status" disabled={busy} value={status} onChange={event => { setStatus(event.target.value as StatusDemanda); setError(''); }}>{opcoes.map(item => <option key={item.status} value={item.status}>{statusLabel[item.status]}</option>)}</select></label>
      {escolhida?.exige_texto && <label htmlFor="resumo-entrega">Resumo da entrega<textarea id="resumo-entrega" maxLength={2000} disabled={busy} value={texto} onChange={event => setTexto(event.target.value)} placeholder="Descreva o que foi realizado antes de enviar para avaliação" /></label>}
      <button className="primary" disabled={busy || !escolhida || faltaTexto}>{busy ? 'Salvando status…' : 'Salvar status'}</button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  </section>;
}
