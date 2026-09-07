'use client';
import { Trash2 } from 'lucide-react';
import { cancelarCompromisso, type Compromisso } from '../lib/agenda';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';

export default function CancelarCompromisso({ item, onCancelled }: { item: Compromisso; onCancelled: () => void }) {
  async function cancel() { await cancelarCompromisso(item.id); onCancelled(); }
  return <AlertDialog><AlertDialogTrigger className="icon-action danger" aria-label={`Cancelar ${item.titulo}`}><Trash2 /></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Cancelar este compromisso?</AlertDialogTitle><AlertDialogDescription>Ele deixará de aparecer na agenda, mas o registro do cancelamento será preservado.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction className="danger-action" onClick={cancel}>Cancelar compromisso</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}
