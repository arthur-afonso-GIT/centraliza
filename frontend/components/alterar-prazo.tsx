'use client';
import { useState, type SyntheticEvent } from 'react';
import { alterarPrazo, type DemandaDetalhe } from '../lib/demandas';
import { ApiError } from '../lib/auth';
import { prazoParaInput } from '../lib/prazos';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

export default function AlterarPrazo({ demanda, onSaved }: { demanda: DemandaDetalhe; onSaved: (item: DemandaDetalhe) => void }) {
  const [open, setOpen] = useState(false);
  const [prazo, setPrazo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  function changeOpen(next: boolean) {
    if (busy) return;
    setOpen(next);
    if (next) { setPrazo(prazoParaInput(demanda.prazo)); setError(''); setConflict(false); }
  }
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try { const item = await alterarPrazo(demanda.id, prazo === prazoParaInput(demanda.prazo) ? demanda.prazo : prazo, demanda.atualizada_em); onSaved(item); setOpen(false); }
    catch (reason) { setConflict(reason instanceof ApiError && reason.status === 409); setError(reason instanceof Error ? reason.message : 'Não foi possível salvar o prazo.'); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger className="secondary">Alterar prazo</DialogTrigger>
    <DialogContent className="demand-dialog"><DialogHeader><DialogTitle>Alterar prazo</DialogTitle><DialogDescription>Defina a data e o horário limite para concluir a demanda. Horário de Fortaleza (UTC−3).</DialogDescription></DialogHeader>
      <form className="demand-form" onSubmit={submit}>
        {error && <p className="form-error" role="alert">{error}</p>}
        {conflict && <button type="button" className="secondary" onClick={() => window.location.reload()}>Recarregar demanda</button>}
        <label>Data e horário limite<input required type="datetime-local" value={prazo} onChange={event => setPrazo(event.target.value)} disabled={busy} /></label>
        <div className="form-actions"><button type="button" className="secondary" onClick={() => changeOpen(false)} disabled={busy}>Cancelar</button><button className="primary" disabled={busy || !prazo || conflict}>{busy ? 'Salvando…' : 'Salvar prazo'}</button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
