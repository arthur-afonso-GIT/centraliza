import { ApiError } from './auth';

export type VisaoAgenda = 'dia' | 'semana' | 'mes';
export type Compromisso = { id: number; titulo: string; descricao: string; tipo: 'reuniao' | 'atividade'; inicio: string; fim: string; participantes: Array<{ id: number; nome: string }> };
export type AgendaResponse = { inicio: string; fim: string; timezone: 'America/Fortaleza'; results: Compromisso[] };

const dateFrom = (value: string) => new Date(`${value}T12:00:00Z`);
export const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const shiftDays = (value: string, amount: number) => { const date = dateFrom(value); date.setUTCDate(date.getUTCDate() + amount); return isoDate(date); };

export function hojeFortaleza() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function intervaloAgenda(view: VisaoAgenda, reference: string) {
  let start = reference;
  if (view === 'semana') {
    const weekday = dateFrom(reference).getUTCDay();
    start = shiftDays(reference, -(weekday === 0 ? 6 : weekday - 1));
  } else if (view === 'mes') start = `${reference.slice(0, 7)}-01`;
  let end: string;
  if (view === 'dia') end = shiftDays(start, 1);
  else if (view === 'semana') end = shiftDays(start, 7);
  else { const date = dateFrom(start); date.setUTCMonth(date.getUTCMonth() + 1); end = isoDate(date); }
  return { start, end, inicio: `${start}T00:00:00-03:00`, fim: `${end}T00:00:00-03:00` };
}

export function moverReferencia(view: VisaoAgenda, reference: string, direction: number) {
  if (view === 'dia') return shiftDays(reference, direction);
  if (view === 'semana') return shiftDays(reference, direction * 7);
  const date = dateFrom(`${reference.slice(0, 7)}-01`); date.setUTCMonth(date.getUTCMonth() + direction); return isoDate(date);
}

export function diasEntre(start: string, end: string) {
  const days: string[] = [];
  for (let current = start; current < end; current = shiftDays(current, 1)) days.push(current);
  return days;
}

export function ocorreNoDia(item: Compromisso, day: string) {
  const next = shiftDays(day, 1);
  return item.inicio < `${next}T00:00:00-03:00` && item.fim > `${day}T00:00:00-03:00`;
}

export async function listarCompromissos(inicio: string, fim: string, signal?: AbortSignal) {
  const query = new URLSearchParams({ inicio, fim });
  const response = await fetch(`/api/compromissos/?${query}`, { credentials: 'same-origin', signal });
  if (!response.ok) throw new ApiError(response.status, 'Não foi possível carregar a agenda.');
  return response.json() as Promise<AgendaResponse>;
}
