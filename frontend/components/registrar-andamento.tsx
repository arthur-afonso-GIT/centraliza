'use client';
import { useRef, useState, type SyntheticEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '../lib/auth';
import { registrarAndamento, type DemandaDetalhe } from '../lib/demandas';

export default function RegistrarAndamento({ demandaId, onSaved }: { demandaId: number; onSaved: (demanda: DemandaDetalhe) => void }) {
  const router = useRouter();
  const submitting = useRef(false);
  const [realizado, setRealizado] = useState('');
  const [pendente, setPendente] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !realizado.trim() || !pendente.trim()) return;
    submitting.current = true;
    setBusy(true); setError('');
    try {
      const demanda = await registrarAndamento(demandaId, realizado.trim(), pendente.trim());
      setRealizado(''); setPendente('');
      onSaved(demanda);
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) router.replace('/login');
      else setError(reason instanceof Error ? reason.message : 'Não foi possível registrar o andamento. Tente novamente.');
    } finally { submitting.current = false; setBusy(false); }
  }

  return <section className="detail-card" aria-labelledby="registrar-andamento">
    <h2 id="registrar-andamento">Registrar andamento</h2>
    <p>Informe o progresso da atividade. O registro ficará no histórico para consulta por você e pela gestão.</p>
    <form className="comment-form progress-form" onSubmit={submit} aria-busy={busy}>
      <label htmlFor="andamento-realizado">O que foi realizado</label>
      <textarea id="andamento-realizado" required maxLength={2000} value={realizado} disabled={busy} onChange={event => setRealizado(event.target.value)} />
      <label htmlFor="andamento-pendente">O que está pendente</label>
      <textarea id="andamento-pendente" required maxLength={2000} value={pendente} disabled={busy} onChange={event => setPendente(event.target.value)} aria-describedby="andamento-ajuda" />
      <small id="andamento-ajuda">Até 2.000 caracteres por campo. Se não houver pendências, informe “Nenhuma pendência”.</small>
      {error && <p role="alert">{error}</p>}
      <button className="primary" disabled={busy || !realizado.trim() || !pendente.trim()}>{busy ? 'Salvando andamento…' : 'Salvar andamento'}</button>
    </form>
  </section>;
}
