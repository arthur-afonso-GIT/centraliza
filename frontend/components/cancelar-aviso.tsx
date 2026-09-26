'use client';
import { useState } from 'react';
import { Ban } from 'lucide-react';
import { cancelarAviso } from '../lib/avisos';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';

export default function CancelarAviso({ id, onCancelled }: { id: number; onCancelled: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function cancel() {
    if (busy) return;
    setBusy(true); setError('');
    try { await cancelarAviso(id); setOpen(false); onCancelled(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível cancelar o aviso.'); }
    finally { setBusy(false); }
  }
  return <AlertDialog open={open} onOpenChange={value => { if (!busy) { setOpen(value); setError(''); } }}><AlertDialogTrigger className="danger-action"><Ban size={17} /> Cancelar aviso</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Cancelar este aviso?</AlertDialogTitle><AlertDialogDescription>Ele deixará de aparecer para a equipe, mas o registro será preservado.</AlertDialogDescription></AlertDialogHeader>{error && <p className="form-error" role="alert">{error}</p>}<AlertDialogFooter><AlertDialogCancel disabled={busy}>Voltar</AlertDialogCancel><AlertDialogAction disabled={busy} className="danger-action" onClick={cancel}>{busy ? 'Cancelando…' : 'Cancelar aviso'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}
