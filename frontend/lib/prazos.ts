const fuso = 'America/Fortaleza';

export function prazoParaInput(value: string): string {
  if (!value) return '';
  if (!value.includes('T')) return `${value}T23:59`;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}

export function prazoParaApi(value: string): string {
  // O formulário usa o horário institucional, independente do fuso do navegador.
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? `${value}:00-03:00` : value;
}

export function formatarPrazo(value: string): string {
  const iso = value.includes('T') ? value : `${value}T23:59:00-03:00`;
  return new Intl.DateTimeFormat('pt-BR', { timeZone: fuso, dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}
