'use client';
import { useState } from 'react';
import { Ban } from 'lucide-react';
import { alterarStatus, type DemandaDetalhe } from '../lib/demandas';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';

export default function CancelarDemanda({ id, onSaved }: { id: number; onSaved: (item: DemandaDetalhe) => void }) {
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function cancel() {
    if (!motivo.trim()) return;
    setBusy(true); setError('');
    try { onSaved(await alterarStatus(id, 'cancelada', motivo)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível cancelar a demanda.'); }
    finally { setBusy(false); }
  }
  return <AlertDialog><AlertDialogTrigger className="danger-action"><Ban size={17} /> Cancelar demanda</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Cancelar esta demanda?</AlertDialogTitle><AlertDialogDescription>O cancelamento encerra o fluxo e permanece registrado no histórico.</AlertDialogDescription></AlertDialogHeader><label className="cancel-reason" htmlFor="motivo-cancelamento">Motivo do cancelamento<textarea id="motivo-cancelamento" maxLength={2000} value={motivo} onChange={event => setMotivo(event.target.value)} /></label>{error && <p className="form-error" role="alert">{error}</p>}<AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction className="danger-action" disabled={busy || !motivo.trim()} onClick={cancel}>{busy ? 'Cancelando…' : 'Confirmar cancelamento'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}
