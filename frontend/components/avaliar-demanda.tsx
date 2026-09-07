'use client';
import { useState } from 'react';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { alterarStatus, type DemandaDetalhe, type StatusDemanda } from '../lib/demandas';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';

export default function AvaliarDemanda({ id, onSaved }: { id: number; onSaved: (item: DemandaDetalhe, message: string) => void }) {
  const [mode, setMode] = useState<'aprovar' | 'corrigir' | null>(null);
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit() {
    if (!mode || (mode === 'corrigir' && !motivo.trim())) return;
    setBusy(true); setError('');
    const status: StatusDemanda = mode === 'aprovar' ? 'concluida' : 'em_correcao';
    try {
      const item = await alterarStatus(id, status, motivo);
      onSaved(item, mode === 'aprovar' ? 'Demanda aprovada e concluída.' : 'Demanda devolvida para correção.');
      setMode(null); setMotivo('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível registrar a avaliação.'); }
    finally { setBusy(false); }
  }
  return <div className="evaluation-actions"><AlertDialog open={mode !== null} onOpenChange={open => { if (!open) { setMode(null); setError(''); } }}><AlertDialogTrigger className="primary" onClick={() => setMode('aprovar')}><CheckCircle2 size={17} /> Aprovar demanda</AlertDialogTrigger><AlertDialogTrigger className="secondary" onClick={() => setMode('corrigir')}><RotateCcw size={17} /> Solicitar correção</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{mode === 'aprovar' ? 'Aprovar e concluir a demanda?' : 'Devolver para correção?'}</AlertDialogTitle><AlertDialogDescription>{mode === 'aprovar' ? 'A aprovação encerra o fluxo e ficará registrada no histórico.' : 'Explique ao inspetor o que precisa ser corrigido.'}</AlertDialogDescription></AlertDialogHeader>{mode === 'corrigir' && <label className="cancel-reason" htmlFor="motivo-correcao">Justificativa da correção<textarea id="motivo-correcao" maxLength={2000} value={motivo} onChange={event => setMotivo(event.target.value)} /></label>}{error && <p className="form-error" role="alert">{error}</p>}<AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction disabled={busy || (mode === 'corrigir' && !motivo.trim())} onClick={submit}>{busy ? 'Registrando…' : mode === 'aprovar' ? 'Confirmar aprovação' : 'Enviar para correção'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>;
}
