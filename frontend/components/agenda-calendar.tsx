'use client';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ApiError } from '../lib/auth';
import { diasEntre, hojeFortaleza, intervaloAgenda, listarCompromissos, moverReferencia, ocorreNoDia, type AgendaResponse, type Compromisso, type VisaoAgenda } from '../lib/agenda';

const views: Array<{ id: VisaoAgenda; label: string }> = [{ id: 'dia', label: 'Dia' }, { id: 'semana', label: 'Semana' }, { id: 'mes', label: 'Mês' }];
const dateLabel = (value: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('pt-BR', { ...options, timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
const timeLabel = (value: string) => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Fortaleza' }).format(new Date(value));

function EventCard({ item }: { item: Compromisso }) {
  return <article className={`calendar-event event-${item.tipo}`}><span>{item.tipo === 'reuniao' ? 'Reunião' : 'Atividade'}</span><strong>{item.titulo}</strong><time>{timeLabel(item.inicio)}–{timeLabel(item.fim)}</time></article>;
}

export default function AgendaCalendar() {
  const router = useRouter();
  const today = hojeFortaleza();
  const [view, setView] = useState<VisaoAgenda>('semana');
  const [reference, setReference] = useState(today);
  const [agenda, setAgenda] = useState<AgendaResponse | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const range = useMemo(() => intervaloAgenda(view, reference), [view, reference]);
  useEffect(() => {
    const controller = new AbortController();
    listarCompromissos(range.inicio, range.fim, controller.signal).then(setAgenda).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      if (reason instanceof ApiError && reason.status === 401) router.replace('/login'); else setError(true);
    });
    return () => controller.abort();
  }, [range.inicio, range.fim, attempt, router]);
  function prepare() { setAgenda(null); setError(false); }
  function changeView(next: VisaoAgenda) { prepare(); setView(next); }
  function move(direction: number) { prepare(); setReference(value => moverReferencia(view, value, direction)); }
  function goToday() { prepare(); setReference(today); }
  function retry() { prepare(); setAttempt(value => value + 1); }
  const days = diasEntre(range.start, range.end);
  const containsToday = today >= range.start && today < range.end;
  const heading = view === 'dia' ? dateLabel(range.start, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : view === 'semana' ? `${dateLabel(range.start, { day: '2-digit', month: 'short' })} – ${dateLabel(days.at(-1)!, { day: '2-digit', month: 'short', year: 'numeric' })}` : dateLabel(range.start, { month: 'long', year: 'numeric' });
  return <section className="calendar" aria-labelledby="periodo-agenda">
    <header className="calendar-toolbar"><div><span className="eyebrow">AGENDA DA EQUIPE</span><h2 id="periodo-agenda">{heading}</h2></div><div className="calendar-controls"><button className="secondary" onClick={() => move(-1)} aria-label={`Período anterior na visão de ${view}`}><ChevronLeft /></button><button className="secondary today-button" disabled={containsToday} onClick={goToday}>Hoje</button><button className="secondary" onClick={() => move(1)} aria-label={`Próximo período na visão de ${view}`}><ChevronRight /></button><div className="view-switch" aria-label="Visualização da agenda">{views.map(item => <button key={item.id} aria-pressed={view === item.id} onClick={() => changeView(item.id)}>{item.label}</button>)}</div></div></header>
    {!agenda && !error && <output className="calendar-state"><span className="spinner" /> Carregando compromissos…</output>}
    {error && <div className="calendar-state" role="alert"><AlertTriangle /><strong>Não foi possível carregar a agenda</strong><button className="secondary" onClick={retry}><RotateCcw /> Tentar novamente</button></div>}
    {agenda?.results.length === 0 && <div className="calendar-state"><CalendarDays /><strong>Nenhum compromisso neste período</strong><p>Use os controles para consultar outra data.</p></div>}
    {agenda && agenda.results.length > 0 && view === 'dia' && <div className="day-view">{agenda.results.map(item => <EventCard item={item} key={item.id} />)}</div>}
    {agenda && agenda.results.length > 0 && view === 'semana' && <div className="week-view">{days.map(day => <section key={day} className={day === today ? 'is-today' : ''}><h3><span>{dateLabel(day, { weekday: 'short' })}</span>{dateLabel(day, { day: '2-digit' })}</h3><div>{agenda.results.filter(item => ocorreNoDia(item, day)).map(item => <EventCard item={item} key={item.id} />)}</div></section>)}</div>}
    {agenda && agenda.results.length > 0 && view === 'mes' && <div className="month-view">{days.map(day => { const events = agenda.results.filter(item => ocorreNoDia(item, day)); return <button key={day} className={day === today ? 'is-today' : ''} onClick={() => { prepare(); setReference(day); setView('dia'); }} aria-label={`Abrir dia ${dateLabel(day, { day: '2-digit', month: 'long' })}`}><time>{dateLabel(day, { day: '2-digit' })}</time>{events.slice(0, 3).map(item => <span key={item.id}>{item.titulo}</span>)}{events.length > 3 && <small>+{events.length - 3}</small>}</button>; })}</div>}
  </section>;
}
