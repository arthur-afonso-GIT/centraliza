'use client';

import { useEffect, useId, useState, type SyntheticEvent } from 'react';
import { listarRascunhos, salvarRascunho, type RascunhoAviso } from '../lib/avisos';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

const data = (value: string) => new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Fortaleza',
}).format(new Date(value));

export default function RascunhosAvisos() {
  const [expanded, setExpanded] = useState(false);
  return <section className="notice-drafts" aria-label="Rascunhos de avisos">
    <button className="secondary" aria-expanded={expanded} aria-controls="meus-rascunhos" onClick={() => setExpanded(!expanded)}>Meus rascunhos</button>
    {expanded && <div id="meus-rascunhos"><ListaRascunhos /></div>}
  </section>;
}

function ListaRascunhos() {
  const [items, setItems] = useState<RascunhoAviso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<RascunhoAviso | null | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();
    listarRascunhos(controller.signal).then(result => {
      if (!controller.signal.aborted) setItems(result);
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os rascunhos.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  return <>
    <div className="notice-management"><div><h2>Meus rascunhos</h2><p>Somente você pode acessar estes textos nesta equipe. Salvar não publica nem envia o aviso.</p></div>
      <button className="primary" disabled={loading || !!error} onClick={() => { setNotice(''); setEditing(null); }}>Novo rascunho</button>
    </div>
    {loading ? <output>Carregando rascunhos…</output> : error ? <div role="alert"><p>{error}</p><button className="secondary" onClick={() => { setError(''); setLoading(true); setAttempt(value => value + 1); }}>Tentar novamente</button></div> : <>
      {notice && <output className="toast success">{notice}</output>}
      {!items.length ? <p>Você ainda não tem rascunhos. Crie um texto para revisar depois.</p> : <div className="notices-feed">{items.map(item => <article className="notice-card" key={item.id}>
        <span className="notice-tag informativo">Rascunho</span><h3>{item.titulo}</h3>
        <p>{item.conteudo.length > 180 ? `${item.conteudo.slice(0, 180)}…` : item.conteudo}</p>
        <div className="notice-meta"><span>Salvo em <time dateTime={item.atualizado_em}>{data(item.atualizado_em)}</time></span>
          <button className="secondary" aria-label={`Revisar rascunho: ${item.titulo}`} onClick={() => { setNotice(''); setEditing(item); }}>Revisar rascunho</button>
        </div>
      </article>)}</div>}
    </>}
    {editing !== undefined && <EditorRascunho initial={editing} onClose={() => setEditing(undefined)} onSaved={saved => {
      setItems(current => [saved, ...current.filter(item => item.id !== saved.id)]);
      setNotice('Rascunho salvo. Você pode reabri-lo para revisar antes do envio.');
      setEditing(undefined);
    }} />}
  </>;
}

function EditorRascunho({ initial, onClose, onSaved }: { initial: RascunhoAviso | null; onClose: () => void; onSaved: (saved: RascunhoAviso) => void }) {
  const fieldId = useId();
  const [titulo, setTitulo] = useState(initial?.titulo ?? '');
  const [conteudo, setConteudo] = useState(initial?.conteudo ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  function close() {
    if (busy) return;
    const changed = titulo !== (initial?.titulo ?? '') || conteudo !== (initial?.conteudo ?? '');
    if (!changed || window.confirm('Descartar as alterações não salvas deste rascunho?')) onClose();
  }
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!titulo.trim() || !conteudo.trim()) { setError('Preencha o título e o conteúdo.'); return; }
    setBusy(true); setError('');
    try { onSaved(await salvarRascunho({ titulo: titulo.trim(), conteudo: conteudo.trim() }, initial?.id)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível salvar o rascunho.'); }
    finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={open => { if (!open) close(); }}><DialogContent className="demand-dialog">
    <DialogHeader><DialogTitle>{initial ? 'Revisar rascunho' : 'Novo rascunho'}</DialogTitle>
      <DialogDescription>Escreva e revise seu comunicado. Ele permanece privado e não será enviado ao salvar.</DialogDescription></DialogHeader>
    <form className="demand-form" onSubmit={submit}>
      <div className="draft-field"><label htmlFor={`${fieldId}-titulo`}>Título</label><input id={`${fieldId}-titulo`} required maxLength={200} disabled={busy} value={titulo} onChange={event => setTitulo(event.target.value)} /></div>
      <div className="draft-field"><label htmlFor={`${fieldId}-conteudo`}>Conteúdo</label><textarea id={`${fieldId}-conteudo`} required rows={8} disabled={busy} value={conteudo} onChange={event => setConteudo(event.target.value)} /></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button type="button" className="secondary" disabled={busy} onClick={close}>Voltar</button>
        <button className="primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar rascunho'}</button></div>
    </form>
  </DialogContent></Dialog>;
}
