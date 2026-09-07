'use client';
import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, Clock3, MessageSquare, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ApiError, type User } from '../lib/auth';
import { adicionarComentario, alterarStatus, obterDemanda, type DemandaDetalhe } from '../lib/demandas';
import DemandaForm from './demanda-form';
import CancelarDemanda from './cancelar-demanda';

const statusLabel: Record<string, string> = { pendente: 'Pendente', em_andamento: 'Em andamento', aguardando_avaliacao: 'Aguardando avaliação', em_correcao: 'Em correção', concluida: 'Concluída', cancelada: 'Cancelada' };
const prioridadeLabel: Record<string, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };
const data = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: value.includes('T') ? 'short' : undefined, timeZone: value.includes('T') ? 'America/Fortaleza' : 'UTC' }).format(new Date(value.includes('T') ? value : `${value}T00:00:00Z`));

export default function DemandaDetail({ id, user }: { id: number; user: User }) {
  const router = useRouter();
  const contentRef = useRef<HTMLElement>(null);
  const focused = useRef(false);
  const [demanda, setDemanda] = useState<DemandaDetalhe | null>(null);
  const [error, setError] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [texto, setTexto] = useState('');
  const [resumoEntrega, setResumoEntrega] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    obterDemanda(id, controller.signal).then(setDemanda).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      const status = reason instanceof ApiError ? reason.status : 0;
      if (status === 401) router.replace('/login'); else setError(status || 500);
    });
    return () => controller.abort();
  }, [id, attempt, router]);
  useEffect(() => { if (demanda && !focused.current) { focused.current = true; contentRef.current?.focus({ preventScroll: true }); } }, [demanda]);
  function retry() { setDemanda(null); setError(null); setAttempt(value => value + 1); }
  async function advance() {
    if (!demanda || !['pendente', 'em_andamento', 'em_correcao'].includes(demanda.status)) return;
    setBusy(true); setNotice(null);
    try {
      const next = demanda.status === 'pendente' ? 'em_andamento' : 'aguardando_avaliacao';
      setDemanda(await alterarStatus(id, next, resumoEntrega));
      setResumoEntrega('');
      setNotice({ type: 'success', text: next === 'em_andamento' ? 'Demanda iniciada com sucesso.' : 'Demanda enviada para avaliação.' });
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) router.replace('/login');
      else setNotice({ type: 'error', text: reason instanceof Error ? reason.message : 'Não foi possível alterar o status.' });
    } finally { setBusy(false); }
  }
  async function comment(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = texto.trim(); if (!content) return;
    setBusy(true); setNotice(null);
    try {
      const created = await adicionarComentario(id, content);
      setDemanda(current => current ? { ...current, historico: [created, ...current.historico] } : current);
      setTexto(''); setNotice({ type: 'success', text: 'Comentário registrado.' });
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) router.replace('/login');
      else setNotice({ type: 'error', text: reason instanceof Error ? reason.message : 'Não foi possível registrar o comentário.' });
    } finally { setBusy(false); }
  }
  if (!demanda && !error) return <main id="conteudo" className="content detail-state" tabIndex={-1}><output><span className="spinner" /> Carregando detalhe da demanda…</output></main>;
  if (error) return <main id="conteudo" className="content detail-state" tabIndex={-1} role="alert"><AlertTriangle size={38} /><h1>{error === 404 ? 'Demanda indisponível' : 'Não foi possível carregar'}</h1><p>{error === 404 ? 'Ela não existe ou não está disponível para o seu perfil.' : 'Verifique a conexão com a API e tente novamente.'}</p><button className="secondary" onClick={retry}><RotateCcw size={17} /> Tentar novamente</button><Link href="/demandas">Voltar para demandas</Link></main>;
  if (!demanda) return null;
  const needsSummary = demanda.status === 'em_andamento' || demanda.status === 'em_correcao';
  const next = demanda.status === 'pendente' ? 'Iniciar demanda' : needsSummary ? 'Enviar para avaliação' : null;
  return <main ref={contentRef} id="conteudo" className="content demand-detail" tabIndex={-1}>
    <Link className="back-link" href="/demandas"><ArrowLeft size={18} /> Voltar para demandas</Link>
    <header className="detail-heading"><div><span className="eyebrow">DETALHE DA DEMANDA</span><h1>{demanda.titulo}</h1><p>Atualizada em {data(demanda.atualizada_em)}</p></div><div className="detail-actions"><span className={`status status-${demanda.status}`}>{statusLabel[demanda.status]}</span>{demanda.critica && <span className="critical"><AlertTriangle size={15} /> Crítica</span>}{user.perfil === 'gestor' && !['concluida', 'cancelada'].includes(demanda.status) && <><DemandaForm initial={demanda} onSaved={item => { setDemanda(item); setNotice({ type: 'success', text: 'Demanda atualizada com sucesso.' }); }} /><CancelarDemanda id={demanda.id} onSaved={item => { setDemanda(item); setNotice({ type: 'success', text: 'Demanda cancelada.' }); }} /></>}{user.perfil === 'inspetor' && next && <button className="primary" disabled={busy || (needsSummary && !resumoEntrega.trim())} onClick={advance}>{busy ? 'Atualizando…' : next}</button>}</div></header>
    {notice && <div className={`toast ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>{notice.type === 'success' ? <CheckCircle2 /> : <AlertTriangle />}{notice.text}</div>}
    {user.perfil === 'inspetor' && needsSummary && <section className="detail-card"><label htmlFor="resumo-entrega"><strong>Resumo da entrega</strong></label><textarea id="resumo-entrega" maxLength={2000} value={resumoEntrega} onChange={event => setResumoEntrega(event.target.value)} placeholder="Descreva o que foi realizado antes de enviar para avaliação" /></section>}
    <div className="detail-grid"><section className="detail-card" aria-labelledby="dados-demanda"><h2 id="dados-demanda">Informações</h2><p className="description">{demanda.descricao || 'Nenhuma descrição informada.'}</p><dl><div><dt>Origem</dt><dd>{demanda.origem || 'Não informada'}</dd></div><div><dt>Prazo</dt><dd><CalendarDays size={17} /> {data(demanda.prazo)}</dd></div><div><dt>Prioridade</dt><dd>{prioridadeLabel[demanda.prioridade]}</dd></div><div><dt>Responsável</dt><dd>{demanda.responsavel?.nome ?? 'Não atribuída'}</dd></div><div><dt>Criada em</dt><dd>{data(demanda.criada_em)}</dd></div></dl></section>
      <section className="detail-card history" aria-labelledby="historico"><h2 id="historico">Histórico</h2><form className="comment-form" onSubmit={comment}><label htmlFor="comentario">Adicionar registro</label><textarea id="comentario" maxLength={2000} value={texto} onChange={event => setTexto(event.target.value)} placeholder="Escreva uma observação sobre a demanda" /><button className="secondary" disabled={busy || !texto.trim()}><MessageSquare size={17} /> Registrar comentário</button></form>{demanda.historico.length === 0 ? <p className="empty-history">Ainda não há eventos registrados.</p> : <ol className="timeline">{demanda.historico.map(event => { const actionLabel: Record<string, string> = { demanda_criada: 'Demanda criada', demanda_editada: 'Demanda editada', responsavel_alterado: 'Responsável alterado' }; return <li key={event.id}><span className="timeline-icon">{event.tipo === 'comentario' ? <MessageSquare /> : <Clock3 />}</span><div><strong>{event.tipo === 'comentario' ? 'Comentário registrado' : event.tipo === 'status_alterado' ? `${statusLabel[event.status_anterior]} → ${statusLabel[event.status_novo]}` : actionLabel[event.tipo]}</strong>{event.texto && <p>{event.texto}</p>}<small>{event.autor.nome} · {data(event.criado_em)}</small></div></li>; })}</ol>}</section></div>
  </main>;
}
