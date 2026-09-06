'use client';
import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { listarDemandas, type PaginaDemandas, type SegmentoDemanda } from '../lib/demandas';
import type { User } from '../lib/auth';

const segmentos: { id: SegmentoDemanda; label: string }[] = [{ id: 'pendentes', label: 'Pendentes' }, { id: 'andamento', label: 'Em andamento' }, { id: 'criticas', label: 'Críticas' }];
const statusLabel = { pendente: 'Pendente', em_andamento: 'Em andamento' };
const prioridadeLabel = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };

export default function DemandasList({ user }: { user: User }) {
  const [segmento, setSegmento] = useState<SegmentoDemanda>('pendentes');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginaDemandas | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  useEffect(() => {
    const controller = new AbortController();
    listarDemandas(segmento, page, user.perfil, controller.signal)
      .then(setData)
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === 'AbortError')) setError(true);
      });
    return () => controller.abort();
  }, [segmento, page, user.perfil, attempt]);
  function prepareRequest() { setData(null); setError(false); }
  function select(next: SegmentoDemanda) { prepareRequest(); setSegmento(next); setPage(1); }
  function changePage(next: number) { prepareRequest(); setPage(next); }
  function retry() { prepareRequest(); setAttempt(value => value + 1); }
  function moveTab(index: number, direction: number) {
    const nextIndex = (index + direction + segmentos.length) % segmentos.length;
    select(segmentos[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  }
  return <section className="demands" aria-labelledby="demandas-titulo">
    <div className="segments" role="tablist" aria-label="Filtrar demandas">{segmentos.map((item, index) => <button key={item.id} ref={element => { tabRefs.current[index] = element; }} role="tab" aria-selected={segmento === item.id} tabIndex={segmento === item.id ? 0 : -1} onClick={() => select(item.id)} onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); moveTab(index, event.key === 'ArrowRight' ? 1 : -1); } }}>{item.label}</button>)}</div>
    <div className="list-summary"><h2 id="demandas-titulo">{segmentos.find(item => item.id === segmento)?.label}</h2><span aria-live="polite">{data ? `${data.count} demanda${data.count === 1 ? '' : 's'}` : 'Atualizando…'}</span></div>
    {!data && !error && <output className="demand-loading"><span className="spinner" /> Carregando demandas…</output>}
    {error && <div className="demand-empty" role="alert"><AlertTriangle /><h3>Não foi possível carregar</h3><p>Tente novamente para consultar as demandas.</p><button className="secondary" onClick={retry}><RotateCcw size={17} /> Tentar novamente</button></div>}
    {data?.results.length === 0 && <div className="demand-empty"><h3>Nenhuma demanda neste segmento</h3><p>Quando houver novas atividades, elas aparecerão aqui.</p></div>}
    {data && data.results.length > 0 && <div className="demand-list">{data.results.map(item => <article className="demand-card" key={item.id}><div className="demand-card-top"><span className={`status status-${item.status}`}>{statusLabel[item.status]}</span>{item.critica && <span className="critical"><AlertTriangle size={15} /> Crítica</span>}</div><h3>{item.titulo}</h3><dl><div><dt>Prioridade</dt><dd>{prioridadeLabel[item.prioridade]}</dd></div><div><dt>Prazo</dt><dd><CalendarDays size={16} /> {new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${item.prazo}T00:00:00Z`))}</dd></div><div><dt>Responsável</dt><dd>{item.responsavel?.nome ?? 'Não atribuída'}</dd></div></dl></article>)}</div>}
    {data && data.count > 0 && <nav className="pagination" aria-label="Paginação das demandas"><button disabled={!data.previous} onClick={() => changePage(page - 1)}><ChevronLeft size={17} /> Anterior</button><span>Página {page} de {Math.ceil(data.count / 4)}</span><button disabled={!data.next} onClick={() => changePage(page + 1)}>Próxima <ChevronRight size={17} /></button></nav>}
  </section>;
}
