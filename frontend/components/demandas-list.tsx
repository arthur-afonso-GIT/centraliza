'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { listarDemandas, listarInspetores, type FiltrosDemandas, type Inspetor, type PaginaDemandas, type SegmentoDemanda } from '../lib/demandas';
import type { User } from '../lib/auth';
import DemandaForm from './demanda-form';

const segmentos: { id: SegmentoDemanda; label: string }[] = [{ id: 'pendentes', label: 'Pendentes' }, { id: 'andamento', label: 'Em andamento' }, { id: 'avaliacao', label: 'Aguardando avaliação' }, { id: 'criticas', label: 'Críticas' }];
const statusLabel: Record<string, string> = { pendente: 'Pendente', em_andamento: 'Em andamento', aguardando_avaliacao: 'Aguardando avaliação', em_correcao: 'Em correção', concluida: 'Concluída', cancelada: 'Cancelada' };
const prioridadeLabel = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };
const filtrosVazios: FiltrosDemandas = { responsavel: '', prazoDe: '', prazoAte: '', atrasada: false };

export default function DemandasList({ user }: { user: User }) {
  const router = useRouter();
  const [segmento, setSegmento] = useState<SegmentoDemanda>('pendentes');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginaDemandas | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [filtros, setFiltros] = useState<FiltrosDemandas>(filtrosVazios);
  const [inspetores, setInspetores] = useState<Inspetor[]>([]);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  useEffect(() => {
    const controller = new AbortController();
    listarDemandas(segmento, page, user.perfil === 'gestor' ? filtros : undefined, controller.signal)
      .then(setData)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        if (typeof reason === 'object' && reason && 'status' in reason && reason.status === 401) router.replace('/login');
        else setError(true);
      });
    return () => controller.abort();
  }, [segmento, page, user.perfil, filtros, attempt, router]);
  useEffect(() => {
    if (user.perfil !== 'gestor') return;
    const controller = new AbortController();
    listarInspetores(controller.signal).then(setInspetores).catch(() => setInspetores([]));
    return () => controller.abort();
  }, [user.perfil]);
  function prepareRequest() { setData(null); setError(false); }
  function select(next: SegmentoDemanda) { prepareRequest(); setSegmento(next); setPage(1); }
  function changePage(next: number) { prepareRequest(); setPage(next); }
  function retry() { prepareRequest(); setAttempt(value => value + 1); }
  function updateFilter(key: keyof FiltrosDemandas, value: string | boolean) { prepareRequest(); setPage(1); setFiltros(current => ({ ...current, [key]: value })); }
  function moveTab(index: number, direction: number) {
    const nextIndex = (index + direction + segmentos.length) % segmentos.length;
    select(segmentos[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  }
  return <section className="demands" aria-labelledby="demandas-titulo">
    {user.perfil === 'gestor' && <div className="demand-management"><DemandaForm onSaved={() => { prepareRequest(); setSegmento('pendentes'); setPage(1); setAttempt(value => value + 1); }} /></div>}
    {user.perfil === 'gestor' && <div className="demand-filters" aria-label="Filtros avançados"><label>Responsável<select value={filtros.responsavel} onChange={event => updateFilter('responsavel', event.target.value)}><option value="">Todos</option>{inspetores.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label><label>Prazo inicial<input type="date" value={filtros.prazoDe} onChange={event => updateFilter('prazoDe', event.target.value)} /></label><label>Prazo final<input type="date" value={filtros.prazoAte} min={filtros.prazoDe || undefined} onChange={event => updateFilter('prazoAte', event.target.value)} /></label><label className="filter-check"><input type="checkbox" checked={filtros.atrasada} onChange={event => updateFilter('atrasada', event.target.checked)} />Somente atrasadas</label><button className="filter-clear" disabled={!filtros.responsavel && !filtros.prazoDe && !filtros.prazoAte && !filtros.atrasada} onClick={() => { prepareRequest(); setPage(1); setFiltros(filtrosVazios); }}>Limpar filtros</button></div>}
    <div className="segments" role="tablist" aria-label="Filtrar demandas">{segmentos.map((item, index) => <button key={item.id} ref={element => { tabRefs.current[index] = element; }} role="tab" aria-selected={segmento === item.id} tabIndex={segmento === item.id ? 0 : -1} onClick={() => select(item.id)} onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); moveTab(index, event.key === 'ArrowRight' ? 1 : -1); } }}>{item.label}</button>)}</div>
    <div className="list-summary"><h2 id="demandas-titulo">{segmentos.find(item => item.id === segmento)?.label}</h2><span aria-live="polite">{data ? `${data.count} demanda${data.count === 1 ? '' : 's'}` : 'Atualizando…'}</span></div>
    {!data && !error && <output className="demand-loading"><span className="spinner" /> Carregando demandas…</output>}
    {error && <div className="demand-empty" role="alert"><AlertTriangle /><h3>Não foi possível carregar</h3><p>Tente novamente para consultar as demandas.</p><button className="secondary" onClick={retry}><RotateCcw size={17} /> Tentar novamente</button></div>}
    {data?.results.length === 0 && <div className="demand-empty"><h3>Nenhuma demanda neste segmento</h3><p>Quando houver novas atividades, elas aparecerão aqui.</p></div>}
    {data && data.results.length > 0 && <div className="demand-list">{data.results.map(item => <article className="demand-card" key={item.id}><div className="demand-card-top"><span className={`status status-${item.status}`}>{statusLabel[item.status]}</span>{item.critica && <span className="critical"><AlertTriangle size={15} /> Crítica</span>}{item.atrasada && <span className="overdue"><CalendarDays size={15} /> Atrasada</span>}</div><h3>{item.titulo}</h3><dl><div><dt>Prioridade</dt><dd>{prioridadeLabel[item.prioridade]}</dd></div><div><dt>Prazo</dt><dd><CalendarDays size={16} /> {new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${item.prazo}T00:00:00Z`))}</dd></div><div><dt>Responsável</dt><dd>{item.responsavel?.nome ?? 'Não atribuída'}</dd></div></dl><Link className="detail-link" href={`/demandas/${item.id}`}>Ver detalhes <ChevronRight size={17} /></Link></article>)}</div>}
    {data && data.count > 0 && <nav className="pagination" aria-label="Paginação das demandas"><button disabled={!data.previous} onClick={() => changePage(page - 1)}><ChevronLeft size={17} /> Anterior</button><span>Página {page} de {Math.ceil(data.count / 4)}</span><button disabled={!data.next} onClick={() => changePage(page + 1)}>Próxima <ChevronRight size={17} /></button></nav>}
  </section>;
}
