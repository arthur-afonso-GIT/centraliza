'use client';
import { useEffect, useState, type SyntheticEvent } from 'react';
import { AlertTriangle, CalendarPlus, Pencil } from 'lucide-react';
import { ConflitoAgendaError, salvarCompromisso, type Compromisso, type DadosCompromisso } from '../lib/agenda';
import { listarDemandasParaAgenda, listarInspetores, type DemandaResumo, type Inspetor } from '../lib/demandas';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

const local = (value?: string) => value ? value.slice(0, 16) : '';
const offset = (value: string) => `${value}:00-03:00`;

export default function CompromissoForm({ initial, onSaved }: { initial?: Compromisso; onSaved: (item: Compromisso) => void }) {
  const [open, setOpen] = useState(false);
  const [inspetores, setInspetores] = useState<Inspetor[]>([]);
  const [demandas, setDemandas] = useState<DemandaResumo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dados, setDados] = useState({ titulo: initial?.titulo ?? '', descricao: initial?.descricao ?? '', tipo: initial?.tipo ?? 'reuniao', inicio: local(initial?.inicio), fim: local(initial?.fim), participante_ids: initial?.participantes.map(item => item.id) ?? [], demanda_id: initial?.demanda ? String(initial.demanda) : '' });
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    Promise.all([listarInspetores(controller.signal), listarDemandasParaAgenda(controller.signal)]).then(([people, requests]) => { setInspetores(people); setDemandas(requests); }).catch(() => setError('Não foi possível carregar participantes e demandas.'));
    return () => controller.abort();
  }, [open]);
  function toggle(id: number) { setDados(current => ({ ...current, participante_ids: current.participante_ids.includes(id) ? current.participante_ids.filter(item => item !== id) : [...current.participante_ids, id] })); }
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const payload: DadosCompromisso = { ...dados, tipo: dados.tipo as DadosCompromisso['tipo'], inicio: offset(dados.inicio), fim: offset(dados.fim), demanda_id: dados.demanda_id ? Number(dados.demanda_id) : null };
    try { const saved = await salvarCompromisso(payload, initial?.id); onSaved(saved); setOpen(false); }
    catch (reason) { setError(reason instanceof ConflitoAgendaError ? `${reason.message} ${reason.conflitos.map(item => item.titulo).join(', ')}` : reason instanceof Error ? reason.message : 'Não foi possível salvar.'); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger className={initial ? 'icon-action' : 'primary'} aria-label={initial ? `Editar ${initial.titulo}` : undefined}>{initial ? <Pencil /> : <><CalendarPlus size={18} /> Novo compromisso</>}</DialogTrigger><DialogContent className="demand-dialog"><DialogHeader><DialogTitle>{initial ? 'Editar compromisso' : 'Novo compromisso'}</DialogTitle><DialogDescription>Os horários seguem o fuso de Fortaleza. Conflitos de participantes serão informados antes de salvar.</DialogDescription></DialogHeader><form className="demand-form" onSubmit={submit}><label>Título<input required maxLength={200} value={dados.titulo} onChange={event => setDados({ ...dados, titulo: event.target.value })} /></label><label>Descrição<textarea value={dados.descricao} onChange={event => setDados({ ...dados, descricao: event.target.value })} /></label><div className="form-row"><label>Tipo<select value={dados.tipo} onChange={event => setDados({ ...dados, tipo: event.target.value as 'reuniao' | 'atividade' })}><option value="reuniao">Reunião</option><option value="atividade">Atividade</option></select></label><label>Demanda relacionada<select value={dados.demanda_id} onChange={event => setDados({ ...dados, demanda_id: event.target.value })}><option value="">Nenhuma</option>{demandas.map(item => <option value={item.id} key={item.id}>{item.titulo}</option>)}</select></label></div><div className="form-row"><label>Início<input type="datetime-local" required value={dados.inicio} onChange={event => setDados({ ...dados, inicio: event.target.value })} /></label><label>Fim<input type="datetime-local" required value={dados.fim} onChange={event => setDados({ ...dados, fim: event.target.value })} /></label></div><fieldset className="participants"><legend>Participantes</legend>{inspetores.map(item => <label key={item.id}><input type="checkbox" checked={dados.participante_ids.includes(item.id)} onChange={() => toggle(item.id)} /> {item.nome}</label>)}</fieldset>{error && <p className="form-error" role="alert"><AlertTriangle size={17} /> {error}</p>}<div className="form-actions"><button type="button" className="secondary" onClick={() => setOpen(false)}>Voltar</button><button className="primary" disabled={busy || dados.participante_ids.length === 0}>{busy ? 'Salvando…' : 'Salvar compromisso'}</button></div></form></DialogContent></Dialog>;
}
