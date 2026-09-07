'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Download, FileText, Paperclip, Trash2, Upload } from 'lucide-react';
import { ApiError } from '../lib/auth';
import { excluirAnexo, enviarAnexo, listarAnexos, type AnexoDemanda, type StatusDemanda } from '../lib/demandas';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';

const MAX = 10 * 1024 * 1024;
const formatarTamanho = (bytes: number) => bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export default function AnexosDemanda({ demandaId, status, onHistoryChanged }: { demandaId: number; status: StatusDemanda; onHistoryChanged: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [anexos, setAnexos] = useState<AnexoDemanda[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const encerrada = status === 'concluida' || status === 'cancelada';
  const carregar = useCallback((signal?: AbortSignal) => {
    listarAnexos(demandaId, signal).then(setAnexos).catch((reason: unknown) => {
      if (!(reason instanceof DOMException && reason.name === 'AbortError')) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os anexos.');
    }).finally(() => setLoading(false));
  }, [demandaId]);
  useEffect(() => { const controller = new AbortController(); carregar(controller.signal); return () => controller.abort(); }, [carregar]);
  function tentarNovamente() { setLoading(true); setError(''); carregar(); }
  async function upload(file?: File) {
    if (!file) return;
    if (file.size > MAX) { setError('O arquivo deve ter até 10 MB.'); return; }
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) { setError('Envie um arquivo PDF, JPEG ou PNG.'); return; }
    setBusy(true); setError('');
    try { const created = await enviarAnexo(demandaId, file); setAnexos(current => [created, ...current]); onHistoryChanged(); if (input.current) input.current.value = ''; }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Não foi possível enviar o anexo.'); }
    finally { setBusy(false); }
  }
  async function remove(anexo: AnexoDemanda) {
    setBusy(true); setError('');
    try { await excluirAnexo(demandaId, anexo.id); setAnexos(current => current.filter(item => item.id !== anexo.id)); onHistoryChanged(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível remover o anexo.'); }
    finally { setBusy(false); }
  }
  return <section className="detail-card attachments" aria-labelledby="anexos-demanda">
    <div className="attachments-heading"><div><h2 id="anexos-demanda">Anexos</h2><p>PDF, JPEG ou PNG com até 10 MB.</p></div>{!encerrada && <label className={`secondary upload-action ${busy ? 'disabled' : ''}`}><Upload size={17} /> {busy ? 'Enviando…' : 'Adicionar arquivo'}<input ref={input} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" disabled={busy} onChange={event => upload(event.target.files?.[0])} /></label>}</div>
    {error && <div className="attachment-error" role="alert"><AlertTriangle size={17} /> <span>{error}</span><button type="button" onClick={tentarNovamente}>Tentar novamente</button></div>}
    {loading ? <p className="attachment-state"><span className="spinner" /> Carregando anexos…</p> : anexos.length === 0 ? <p className="attachment-state"><Paperclip size={20} /> Nenhum arquivo anexado.</p> : <ul className="attachment-list">{anexos.map(anexo => <li key={anexo.id}><span className="attachment-icon"><FileText /></span><div><strong>{anexo.nome_original}</strong><small>{formatarTamanho(anexo.tamanho)} · {anexo.autor.nome}</small></div><a className="icon-action" href={anexo.download_url} download aria-label={`Baixar ${anexo.nome_original}`}><Download /></a><AlertDialog><AlertDialogTrigger className="icon-action danger" aria-label={`Remover ${anexo.nome_original}`} disabled={busy}><Trash2 /></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remover este anexo?</AlertDialogTitle><AlertDialogDescription>O arquivo deixa de ficar disponível e a remoção permanece registrada no histórico.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction className="danger-action" onClick={() => remove(anexo)}>Remover anexo</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></li>)}</ul>}
  </section>;
}
