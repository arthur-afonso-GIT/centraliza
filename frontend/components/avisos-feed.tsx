'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Bell, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ApiError } from '../lib/auth';
import { listarAvisos, type AvisoFeed } from '../lib/avisos';
import type { User } from '../lib/auth';
import AvisoForm from './aviso-form';

const data = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Fortaleza' }).format(new Date(value));

export default function AvisosFeed({ user }: { user: User }) {
  const router = useRouter();
  const [items, setItems] = useState<AvisoFeed[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    listarAvisos(controller.signal).then(setItems).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      if (reason instanceof ApiError && reason.status === 401) router.replace('/login');
      else setError(true);
    });
    return () => controller.abort();
  }, [attempt, router]);
  if (!items && !error) return <section className="notices-state"><output><span className="spinner" /> Carregando avisos…</output></section>;
  if (error) return <section className="notices-state" role="alert"><AlertTriangle size={36} /><h2>Não foi possível carregar os avisos</h2><p>Verifique a conexão e tente novamente.</p><button className="secondary" onClick={() => { setError(false); setItems(null); setAttempt(value => value + 1); }}><RotateCcw size={17} /> Tentar novamente</button></section>;
  if (!items?.length) return <><div className="notice-management">{user.perfil === 'gestor' && <AvisoForm onSaved={item => setItems([item])} />}</div><section className="notices-state"><Bell size={36} /><h2>Nenhum aviso publicado</h2><p>Os comunicados da sua equipe aparecerão aqui.</p></section></>;
  return <><div className="notice-management">{user.perfil === 'gestor' && <AvisoForm onSaved={item => setItems(current => [item, ...(current ?? [])])} />}</div><section className="notices-feed" aria-label="Avisos da equipe">{items.map(item => <Link className={`notice-card notice-${item.categoria}`} href={`/avisos/${item.id}`} key={item.id}><div className="notice-card-top"><span className={`notice-tag ${item.categoria}`}>{item.categoria === 'urgente' ? 'Urgente' : 'Informativo'}</span><time dateTime={item.publicado_em}>{data(item.publicado_em)}</time></div><h2>{item.titulo}</h2><p>{item.resumo}</p><div className="notice-meta"><span>{item.destinatarios.length ? `${item.destinatarios.length} destinatário(s)` : 'Toda a equipe'} · {item.autor}</span><span className="card-link">Ler aviso <ArrowRight size={17} /></span></div></Link>)}</section></>;
}
