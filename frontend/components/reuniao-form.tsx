'use client';

import { useEffect, useState, type SyntheticEvent } from 'react';
import { AlertTriangle, CalendarPlus } from 'lucide-react';
import { ConflitoAgendaError, criarReuniao, hojeFortaleza, listarParticipantesReuniao, type Compromisso } from '../lib/agenda';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

const vazio = () => ({ titulo: '', data: hojeFortaleza(), inicio: '', fim: '', pauta: '', participante_ids: [] as number[] });
const horario = (data: string, hora: string) => `${data}T${hora}:00-03:00`;

export default function ReuniaoForm({ onSaved }: { onSaved: (item: Compromisso) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [integrantes, setIntegrantes] = useState<Array<{ id: number; nome: string }>>([]);
  const [dados, setDados] = useState(vazio);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    listarParticipantesReuniao(controller.signal)
      .then(setIntegrantes)
      .catch(reason => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError('Não foi possível carregar os integrantes da equipe.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open]);

  function changeOpen(next: boolean) {
    setOpen(next);
    setLoading(next);
    if (next) { setDados(vazio()); setIntegrantes([]); setError(''); }
  }

  function toggle(id: number) {
    setDados(current => ({
      ...current,
      participante_ids: current.participante_ids.includes(id)
        ? current.participante_ids.filter(item => item !== id)
        : [...current.participante_ids, id],
    }));
  }

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (dados.fim <= dados.inicio) { setError('O horário de término deve ser posterior ao de início.'); return; }
    setBusy(true);
    try {
      const saved = await criarReuniao({
        titulo: dados.titulo, pauta: dados.pauta,
        inicio: horario(dados.data, dados.inicio), fim: horario(dados.data, dados.fim),
        participante_ids: dados.participante_ids,
      });
      onSaved(saved);
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof ConflitoAgendaError
        ? `${reason.message} ${reason.conflitos.map(item => item.titulo).join(', ')}`.trim()
        : reason instanceof Error ? reason.message : 'Não foi possível agendar a reunião.');
    } finally { setBusy(false); }
  }

  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger className="primary"><CalendarPlus size={18} /> Nova reunião</DialogTrigger>
    <DialogContent className="demand-dialog">
      <DialogHeader>
        <DialogTitle>Nova reunião</DialogTitle>
        <DialogDescription>Agende um alinhamento sobre as demandas. Os horários seguem o fuso de Fortaleza. Você participa automaticamente.</DialogDescription>
      </DialogHeader>
      <form className="demand-form" onSubmit={submit}>
        <label>Título<input required maxLength={200} value={dados.titulo} onChange={event => setDados({ ...dados, titulo: event.target.value })} /></label>
        <label>Data<input type="date" required value={dados.data} onChange={event => setDados({ ...dados, data: event.target.value })} /></label>
        <div className="form-row">
          <label>Início<input type="time" required value={dados.inicio} onChange={event => setDados({ ...dados, inicio: event.target.value })} /></label>
          <label>Término<input type="time" required value={dados.fim} onChange={event => setDados({ ...dados, fim: event.target.value })} /></label>
        </div>
        <label>Pauta<textarea required maxLength={2000} value={dados.pauta} onChange={event => setDados({ ...dados, pauta: event.target.value })} placeholder="Assuntos e demandas que serão discutidos" /></label>
        <fieldset className="participants">
          <legend>Convidar colegas da equipe (opcional)</legend>
          {loading && <p>Carregando integrantes…</p>}
          {!loading && integrantes.length === 0 && <p>Nenhum outro integrante disponível.</p>}
          {integrantes.map(item => <label key={item.id}>
            <input type="checkbox" checked={dados.participante_ids.includes(item.id)} onChange={() => toggle(item.id)} /> {item.nome}
          </label>)}
        </fieldset>
        {error && <p className="form-error" role="alert"><AlertTriangle size={17} /> {error}</p>}
        <div className="form-actions">
          <button type="button" className="secondary" onClick={() => setOpen(false)}>Voltar</button>
          <button className="primary" disabled={busy || loading}>{busy ? 'Salvando…' : 'Salvar reunião'}</button>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}
