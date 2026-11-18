'use client';
import { useState, type SyntheticEvent } from 'react';
import { AlertTriangle, CalendarPlus } from 'lucide-react';
import { ConflitoAgendaError, criarReuniao, hojeFortaleza, type Compromisso } from '../lib/agenda';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

const vazio = () => ({ titulo: '', data: hojeFortaleza(), inicio: '', fim: '', pauta: '' });
const horario = (data: string, hora: string) => `${data}T${hora}:00-03:00`;

export default function ReuniaoForm({ onSaved }: { onSaved: (item: Compromisso) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dados, setDados] = useState(vazio);
  function changeOpen(next: boolean) { setOpen(next); if (next) { setDados(vazio()); setError(''); } }
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (dados.fim <= dados.inicio) { setError('O horário de término deve ser posterior ao de início.'); return; }
    setBusy(true);
    try {
      const saved = await criarReuniao({ titulo: dados.titulo, pauta: dados.pauta, inicio: horario(dados.data, dados.inicio), fim: horario(dados.data, dados.fim) });
      onSaved(saved); setOpen(false);
    } catch (reason) {
      setError(reason instanceof ConflitoAgendaError ? `${reason.message} ${reason.conflitos.map(item => item.titulo).join(', ')}` : reason instanceof Error ? reason.message : 'Não foi possível agendar a reunião.');
    } finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={changeOpen}><DialogTrigger className="primary"><CalendarPlus size={18} /> Nova reunião</DialogTrigger><DialogContent className="demand-dialog"><DialogHeader><DialogTitle>Nova reunião</DialogTitle><DialogDescription>Agende um alinhamento sobre as demandas. Os horários seguem o fuso de Fortaleza e a reunião entra na sua agenda.</DialogDescription></DialogHeader><form className="demand-form" onSubmit={submit}><label>Título<input required maxLength={200} value={dados.titulo} onChange={event => setDados({ ...dados, titulo: event.target.value })} /></label><label>Data<input type="date" required value={dados.data} onChange={event => setDados({ ...dados, data: event.target.value })} /></label><div className="form-row"><label>Início<input type="time" required value={dados.inicio} onChange={event => setDados({ ...dados, inicio: event.target.value })} /></label><label>Término<input type="time" required value={dados.fim} onChange={event => setDados({ ...dados, fim: event.target.value })} /></label></div><label>Pauta<textarea required maxLength={2000} value={dados.pauta} onChange={event => setDados({ ...dados, pauta: event.target.value })} placeholder="Assuntos e demandas que serão discutidos" /></label>{error && <p className="form-error" role="alert"><AlertTriangle size={17} /> {error}</p>}<div className="form-actions"><button type="button" className="secondary" onClick={() => setOpen(false)}>Voltar</button><button className="primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar reunião'}</button></div></form></DialogContent></Dialog>;
}
