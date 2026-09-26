'use client';
import { useEffect, useState, type SyntheticEvent } from 'react';
import { AlertTriangle, Megaphone, Pencil } from 'lucide-react';
import { salvarAviso, type AvisoDetalhe, type DadosAviso } from '../lib/avisos';
import { listarInspetores, type Inspetor } from '../lib/demandas';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

const local = (value?: string | null) => value ? value.slice(0, 16) : '';
const agoraLocal = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date()).replace(' ', 'T');
const offset = (value: string) => `${value}:00-03:00`;

export default function AvisoForm({ initial, onSaved }: { initial?: AvisoDetalhe; onSaved: (item: AvisoDetalhe) => void }) {
  const [openedAt, setOpenedAt] = useState(() => Date.now());
  const [open, setOpen] = useState(false);
  const [inspetores, setInspetores] = useState<Inspetor[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [peopleError, setPeopleError] = useState(false);
  const [peopleAttempt, setPeopleAttempt] = useState(0);
  const [dados, setDados] = useState({ titulo: initial?.titulo ?? '', resumo: initial?.resumo ?? '', conteudo: initial?.conteudo ?? '', categoria: initial?.categoria ?? 'informativo', publicado_em: initial ? local(initial.publicado_em) : agoraLocal(), expira_em: local(initial?.expira_em), destinatario_ids: initial?.destinatarios.map(item => item.id) ?? [] });
  function changeOpen(value: boolean) {
    if (busy) return;
    if (value) {
      setError(''); setLoadingPeople(true); setPeopleError(false); setOpenedAt(Date.now());
      setDados({ titulo: initial?.titulo ?? '', resumo: initial?.resumo ?? '', conteudo: initial?.conteudo ?? '', categoria: initial?.categoria ?? 'informativo', publicado_em: initial ? local(initial.publicado_em) : agoraLocal(), expira_em: local(initial?.expira_em), destinatario_ids: initial?.destinatarios.map(item => item.id) ?? [] });
    }
    setOpen(value);
  }
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    listarInspetores(controller.signal).then(setInspetores).catch(() => { if (!controller.signal.aborted) setPeopleError(true); }).finally(() => { if (!controller.signal.aborted) setLoadingPeople(false); });
    return () => controller.abort();
  }, [open, peopleAttempt]);
  function toggle(id: number) { setDados(current => ({ ...current, destinatario_ids: current.destinatario_ids.includes(id) ? current.destinatario_ids.filter(item => item !== id) : [...current.destinatario_ids, id] })); }
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || loadingPeople || peopleError) return; setBusy(true); setError('');
    const payload: DadosAviso = { ...dados, categoria: dados.categoria as DadosAviso['categoria'], publicado_em: offset(dados.publicado_em), expira_em: dados.expira_em ? offset(dados.expira_em) : null };
    try { const saved = await salvarAviso(payload, initial?.id); onSaved(saved); setOpen(false); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível salvar o aviso.'); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={changeOpen}><DialogTrigger className={initial ? 'secondary' : 'primary'}>{initial ? <><Pencil size={17} /> Editar aviso</> : <><Megaphone size={18} /> Publicar aviso</>}</DialogTrigger><DialogContent className="demand-dialog"><DialogHeader><DialogTitle>{initial ? 'Editar aviso' : 'Publicar aviso'}</DialogTitle><DialogDescription>Defina o comunicado, o público e a vigência. Os horários são de Fortaleza.</DialogDescription></DialogHeader><form className="demand-form" onSubmit={submit}><label>Título<input required maxLength={200} value={dados.titulo} onChange={event => setDados({ ...dados, titulo: event.target.value })} /></label><label>Resumo<input required maxLength={300} value={dados.resumo} onChange={event => setDados({ ...dados, resumo: event.target.value })} /></label><label>Conteúdo<textarea required value={dados.conteudo} onChange={event => setDados({ ...dados, conteudo: event.target.value })} /></label><div className="form-row"><label>Categoria<select value={dados.categoria} onChange={event => setDados({ ...dados, categoria: event.target.value as 'urgente' | 'informativo' })}><option value="informativo">Informativo</option><option value="urgente">Urgente</option></select></label><label>Início da publicação<input type="datetime-local" required value={dados.publicado_em} onChange={event => setDados({ ...dados, publicado_em: event.target.value })} /></label></div><label>Fim da publicação (opcional)<input type="datetime-local" min={dados.publicado_em} value={dados.expira_em} onChange={event => setDados({ ...dados, expira_em: event.target.value })} /></label><fieldset className="participants" disabled={loadingPeople || peopleError}><legend>Destinatários específicos</legend>{inspetores.map(item => <label key={item.id}><input type="checkbox" checked={dados.destinatario_ids.includes(item.id)} onChange={() => toggle(item.id)} /> {item.nome}</label>)}</fieldset>{loadingPeople && <output>Carregando destinatários…</output>}{peopleError && <div className="form-error" role="alert">Não foi possível carregar os destinatários.<button type="button" className="secondary" onClick={() => { setLoadingPeople(true); setPeopleError(false); setPeopleAttempt(value => value + 1); }}>Tentar novamente</button></div>}<p className="notice-publish-summary">{dados.destinatario_ids.length ? `Envio para ${dados.destinatario_ids.length} inspetor(es) selecionado(s).` : 'Envio para toda a equipe.'} {dados.publicado_em && new Date(offset(dados.publicado_em)).getTime() > openedAt ? 'O aviso ficará agendado para a data escolhida.' : 'O aviso ficará disponível após salvar.'}</p>{initial && <p className="form-note">Ao salvar alterações, o aviso volta a aparecer como não lido para a equipe.</p>}{error && <p className="form-error" role="alert"><AlertTriangle size={17} /> {error}</p>}<div className="form-actions"><button type="button" className="secondary" disabled={busy} onClick={() => changeOpen(false)}>Voltar</button><button className="primary" disabled={busy || loadingPeople || peopleError}>{busy ? 'Salvando…' : initial ? 'Salvar alterações' : 'Publicar aviso'}</button></div></form></DialogContent></Dialog>;
}
