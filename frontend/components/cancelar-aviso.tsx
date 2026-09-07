'use client';
import { Ban } from 'lucide-react';
import { cancelarAviso } from '../lib/avisos';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';

export default function CancelarAviso({ id, onCancelled }: { id: number; onCancelled: () => void }) {
  return <AlertDialog><AlertDialogTrigger className="danger-action"><Ban size={17} /> Cancelar aviso</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Cancelar este aviso?</AlertDialogTitle><AlertDialogDescription>Ele deixará de aparecer para a equipe, mas o registro será preservado.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction className="danger-action" onClick={async () => { await cancelarAviso(id); onCancelled(); }}>Cancelar aviso</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}
