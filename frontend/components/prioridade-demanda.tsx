'use client';
import { useState, type SyntheticEvent } from 'react';
import { alterarPrioridade, type DemandaDetalhe } from '../lib/demandas';

export default function PrioridadeDemanda({ demanda, onSaved }: { demanda: DemandaDetalhe; onSaved: (item: DemandaDetalhe) => void }) {
  const [prioridade, setPrioridade] = useState(demanda.prioridade);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || prioridade === demanda.prioridade) return;
    setBusy(true); setError(''); setSuccess(false);
    try { onSaved(await alterarPrioridade(demanda.id, prioridade)); setSuccess(true); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível alterar a prioridade.'); }
    finally { setBusy(false); }
  }
  return <section className="detail-card" aria-labelledby="titulo-prioridade">
    <h2 id="titulo-prioridade">Prioridade da demanda</h2>
    <form className="demand-form" onSubmit={submit}>
      <label htmlFor="prioridade-demanda">Nível de prioridade<select id="prioridade-demanda" disabled={busy} value={prioridade} onChange={event => { setPrioridade(event.target.value as DemandaDetalhe['prioridade']); setSuccess(false); setError(''); }}><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select></label>
      <button className="secondary" disabled={busy || prioridade === demanda.prioridade}>{busy ? 'Salvando prioridade…' : 'Salvar prioridade'}</button>
      {error && <p className="form-error" role="alert">{error}</p>}
      {success && <output>Prioridade atualizada com sucesso.</output>}
    </form>
  </section>;
}
