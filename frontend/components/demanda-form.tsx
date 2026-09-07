'use client';
import { useEffect, useState, type SyntheticEvent } from 'react';
import { AlertTriangle, CheckCircle2, Plus, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ApiError } from '../lib/auth';
import { listarInspetores, salvarDemanda, type DadosDemanda, type DemandaDetalhe, type Inspetor } from '../lib/demandas';

const vazio: DadosDemanda = { titulo: '', descricao: '', origem: '', prioridade: 'media', prazo: '', critica: false, responsavel_id: null };

export default function DemandaForm({ initial, onSaved }: { initial?: DemandaDetalhe; onSaved: (item: DemandaDetalhe) => void }) {
  const [open, setOpen] = useState(false);
  const [dados, setDados] = useState<DadosDemanda>(vazio);
  const [inspetores, setInspetores] = useState<Inspetor[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  function changeOpen(next: boolean) {
    setOpen(next);
    if (next) {
      setDados(initial ? { titulo: initial.titulo, descricao: initial.descricao, origem: initial.origem, prioridade: initial.prioridade, prazo: initial.prazo, critica: initial.critica, responsavel_id: initial.responsavel?.id ?? null } : vazio);
      setError(''); setLoadingPeople(true);
    }
  }
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    listarInspetores(controller.signal).then(setInspetores).catch(() => setError('Não foi possível carregar os inspetores.')).finally(() => setLoadingPeople(false));
    return () => controller.abort();
  }, [open, initial]);
  const field = (key: keyof DadosDemanda, value: string | boolean | number | null) => setDados(current => ({ ...current, [key]: value }));
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try { const saved = await salvarDemanda(dados, initial?.id); onSaved(saved); setOpen(false); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Não foi possível salvar a demanda.'); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={changeOpen}><DialogTrigger className={initial ? 'secondary' : 'primary'}>{initial ? <Save size={17} /> : <Plus size={17} />}{initial ? 'Editar demanda' : 'Nova demanda'}</DialogTrigger><DialogContent className="demand-dialog"><DialogHeader><DialogTitle>{initial ? 'Editar demanda' : 'Nova demanda'}</DialogTitle><DialogDescription>Informe os dados de organização e atribuição da atividade.</DialogDescription></DialogHeader><form className="demand-form" onSubmit={submit}>{error && <div className="form-error" role="alert"><AlertTriangle size={17} />{error}</div>}<label>Título<input required maxLength={200} value={dados.titulo} onChange={e => field('titulo', e.target.value)} /></label><label>Descrição<textarea value={dados.descricao} onChange={e => field('descricao', e.target.value)} /></label><div className="form-row"><label>Origem<input maxLength={200} value={dados.origem} onChange={e => field('origem', e.target.value)} /></label><label>Prazo<input required type="date" value={dados.prazo} onChange={e => field('prazo', e.target.value)} /></label></div><div className="form-row"><label>Prioridade<select value={dados.prioridade} onChange={e => field('prioridade', e.target.value)}><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select></label><label>Responsável<select disabled={loadingPeople} value={dados.responsavel_id ?? ''} onChange={e => field('responsavel_id', e.target.value ? Number(e.target.value) : null)}><option value="">Não atribuída</option>{inspetores.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label></div><label className="check-field"><input type="checkbox" checked={dados.critica} onChange={e => field('critica', e.target.checked)} />Demanda crítica</label><div className="form-actions"><button type="button" className="secondary" onClick={() => changeOpen(false)}>Cancelar</button><button className="primary" disabled={busy || loadingPeople}>{busy ? 'Salvando…' : <><CheckCircle2 size={17} /> Salvar demanda</>}</button></div></form></DialogContent></Dialog>;
}
