'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Bell, CheckCheck, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ApiError, type User } from '../lib/auth';
import { listarAvisos, situacaoAvisoLabel, type AvisoFeed } from '../lib/avisos';
import AvisoForm from './aviso-form';

const data = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Fortaleza' }).format(new Date(value));
const normalizar = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

export default function AvisosFeed({ user }: { user: User }) {
  const router = useRouter();
  const [items, setItems] = useState<AvisoFeed[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [leitura, setLeitura] = useState('todos');
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('todas');
  const [situacao, setSituacao] = useState('todas');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    listarAvisos(controller.signal).then(setItems).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      if (reason instanceof ApiError && reason.status === 401) router.replace('/login');
      else setError(true);
    });
    return () => controller.abort();
  }, [attempt, router]);
  function limpar() { setBusca(''); setCategoria('todas'); setLeitura('todos'); setSituacao('todas'); }
  if (!items && !error) return <section className="notices-state"><output><span className="spinner" /> Carregando avisos…</output></section>;
  if (error) return <section className="notices-state" role="alert"><AlertTriangle size={36} /><h2>Não foi possível carregar os avisos</h2><p>Verifique a conexão e tente novamente.</p><button className="secondary" onClick={() => { setError(false); setItems(null); setAttempt(value => value + 1); }}><RotateCcw size={17} /> Tentar novamente</button></section>;
  const naoLidos = items?.filter(item => !item.lido && item.situacao === 'ativo').length ?? 0;
  const filtrados = (items ?? []).filter(item =>
    (leitura === 'todos' || (item.situacao === 'ativo' && (leitura === 'lidos' ? item.lido : !item.lido))) &&
    (categoria === 'todas' || item.categoria === categoria) &&
    (situacao === 'todas' || item.situacao === situacao) &&
    normalizar(`${item.titulo} ${item.resumo} ${item.autor}`).includes(normalizar(busca.trim())),
  ).sort((a, b) => Number(b.categoria === 'urgente') - Number(a.categoria === 'urgente') || Number(a.lido) - Number(b.lido) || b.publicado_em.localeCompare(a.publicado_em));
  return <>
    <div className="notice-management"><p className="notice-inbox-summary"><Bell size={18} /> {naoLidos ? `${naoLidos} aviso${naoLidos === 1 ? '' : 's'} para ler` : 'Nenhum aviso pendente de leitura'}</p>{user.perfil === 'gestor' && <AvisoForm onSaved={item => { setItems(current => [item, ...(current ?? [])]); limpar(); setNotice(item.situacao === 'agendado' ? 'Aviso agendado com sucesso.' : 'Aviso publicado com sucesso.'); }} />}</div>
    {notice && <output className="toast success">{notice}</output>}
    <div className="notice-filters"><label htmlFor="busca-avisos">Buscar avisos<input id="busca-avisos" type="search" value={busca} onChange={event => setBusca(event.target.value)} placeholder="Título, resumo ou autor" /></label><label htmlFor="categoria-avisos">Categoria<select id="categoria-avisos" value={categoria} onChange={event => setCategoria(event.target.value)}><option value="todas">Todas</option><option value="urgente">Urgentes</option><option value="informativo">Informativos</option></select></label>{user.perfil === 'gestor' && <label htmlFor="situacao-avisos">Situação<select id="situacao-avisos" value={situacao} onChange={event => setSituacao(event.target.value)}><option value="todas">Todas</option><option value="ativo">Publicados</option><option value="agendado">Agendados</option><option value="expirado">Expirados</option></select></label>}</div>
    <fieldset className="notice-reading-filters" aria-label="Filtrar por leitura">{[['todos', 'Todos'], ['nao_lidos', 'Não lidos'], ['lidos', 'Lidos']].map(([value, label]) => <button key={value} aria-pressed={leitura === value} onClick={() => setLeitura(value)}>{label}</button>)}</fieldset>
    <p className="notice-result-count" aria-live="polite">{filtrados.length} aviso{filtrados.length === 1 ? '' : 's'}</p>
    {!filtrados.length ? <section className="notices-state"><CheckCheck size={36} /><h2>{!items?.length ? 'Nenhum aviso publicado' : leitura === 'nao_lidos' && !busca && categoria === 'todas' && situacao === 'todas' ? 'Leitura em dia' : 'Nenhum aviso encontrado'}</h2><p>{!items?.length ? 'Os comunicados da sua equipe aparecerão aqui.' : 'Você pode ajustar os filtros ou consultar todos os avisos.'}</p>{!!items?.length && <button className="secondary" onClick={limpar}>Limpar filtros</button>}</section> : <section className="notices-feed" aria-label="Avisos da equipe">{filtrados.map(item => <Link className={`notice-card notice-${item.categoria} ${item.lido ? 'notice-read' : 'notice-unread'}`} href={`/avisos/${item.id}`} key={item.id}><div className="notice-card-top"><div className="notice-badges"><span className={`notice-tag ${item.categoria}`}>{item.categoria === 'urgente' ? 'Urgente' : 'Informativo'}</span><span className="notice-reading-state">{item.situacao !== 'ativo' ? situacaoAvisoLabel[item.situacao] : item.lido ? 'Lido' : 'Não lido'}</span></div><time dateTime={item.publicado_em}>{data(item.publicado_em)}</time></div><h2>{item.titulo}</h2><p>{item.resumo}</p>{item.expira_em && <small className="notice-validity">Até {data(item.expira_em)}</small>}<div className="notice-meta"><span>{item.destinatarios.length ? `${item.destinatarios.length} destinatário(s)` : 'Toda a equipe'} · {item.autor}</span><span className="card-link">{item.lido ? 'Ver aviso' : 'Ler aviso'} <ArrowRight size={17} /></span></div></Link>)}</section>}
  </>;
}
