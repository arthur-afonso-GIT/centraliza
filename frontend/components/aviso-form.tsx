'use client';
import { useEffect, useState, type SyntheticEvent } from 'react';
import { AlertTriangle, Megaphone, Pencil } from 'lucide-react';
import { salvarAviso, type AvisoDetalhe, type DadosAviso } from '../lib/avisos';
import { listarInspetores, type Inspetor } from '../lib/demandas';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

const local = (value?: string | null) => value ? value.slice(0, 16) : '';
const offset = (value: string) => `${value}:00-03:00`;

export default function AvisoForm({ initial, onSaved }: { initial?: AvisoDetalhe; onSaved: (item: AvisoDetalhe) => void }) {
  const [open, setOpen] = useState(false);
  const [inspetores, setInspetores] = useState<Inspetor[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dados, setDados] = useState({ titulo: initial?.titulo ?? '', resumo: initial?.resumo ?? '', conteudo: initial?.conteudo ?? '', categoria: initial?.categoria ?? 'informativo', publicado_em: local(initial?.publicado_em), expira_em: local(initial?.expira_em), destinatario_ids: initial?.destinatarios.map(item => item.id) ?? [] });
  useEffect(() => { if (!open) return; const controller = new AbortController(); listarInspetores(controller.signal).then(setInspetores).catch(() => setError('Não foi possível carregar os destinatários.')); return () => controller.abort(); }, [open]);
  function toggle(id: number) { setDados(current => ({ ...current, destinatario_ids: current.destinatario_ids.includes(id) ? current.destinatario_ids.filter(item => item !== id) : [...current.destinatario_ids, id] })); }
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const payload: DadosAviso = { ...dados, categoria: dados.categoria as DadosAviso['categoria'], publicado_em: offset(dados.publicado_em), expira_em: dados.expira_em ? offset(dados.expira_em) : null };
    try { const saved = await salvarAviso(payload, initial?.id); onSaved(saved); setOpen(false); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível salvar o aviso.'); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger className={initial ? 'secondary' : 'primary'}>{initial ? <><Pencil size={17} /> Editar aviso</> : <><Megaphone size={18} /> Publicar aviso</>}</DialogTrigger><DialogContent className="demand-dialog"><DialogHeader><DialogTitle>{initial ? 'Editar aviso' : 'Publicar aviso'}</DialogTitle><DialogDescription>Sem destinatários selecionados, o comunicado será enviado para toda a equipe.</DialogDescription></DialogHeader><form className="demand-form" onSubmit={submit}><label>Título<input required maxLength={200} value={dados.titulo} onChange={event => setDados({ ...dados, titulo: event.target.value })} /></label><label>Resumo<input required maxLength={300} value={dados.resumo} onChange={event => setDados({ ...dados, resumo: event.target.value })} /></label><label>Conteúdo<textarea required value={dados.conteudo} onChange={event => setDados({ ...dados, conteudo: event.target.value })} /></label><div className="form-row"><label>Categoria<select value={dados.categoria} onChange={event => setDados({ ...dados, categoria: event.target.value as 'urgente' | 'informativo' })}><option value="informativo">Informativo</option><option value="urgente">Urgente</option></select></label><label>Início da publicação<input type="datetime-local" required value={dados.publicado_em} onChange={event => setDados({ ...dados, publicado_em: event.target.value })} /></label></div><label>Fim da publicação (opcional)<input type="datetime-local" value={dados.expira_em} onChange={event => setDados({ ...dados, expira_em: event.target.value })} /></label><fieldset className="participants"><legend>Destinatários específicos</legend>{inspetores.map(item => <label key={item.id}><input type="checkbox" checked={dados.destinatario_ids.includes(item.id)} onChange={() => toggle(item.id)} /> {item.nome}</label>)}</fieldset>{error && <p className="form-error" role="alert"><AlertTriangle size={17} /> {error}</p>}<div className="form-actions"><button type="button" className="secondary" onClick={() => setOpen(false)}>Voltar</button><button className="primary" disabled={busy}>{busy ? 'Salvando…' : initial ? 'Salvar alterações' : 'Publicar aviso'}</button></div></form></DialogContent></Dialog>;
}
