'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ApiError } from '../lib/auth';
import { obterAviso, marcarAvisoLido, situacaoAvisoLabel, type AvisoDetalhe } from '../lib/avisos';
import type { User } from '../lib/auth';
import AvisoForm from './aviso-form';
import CancelarAviso from './cancelar-aviso';

const data = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Fortaleza' }).format(new Date(value));

export default function AvisoDetail({ id, user }: { id: number; user: User }) {
  const router = useRouter();
  const ref = useRef<HTMLElement>(null);
  const [item, setItem] = useState<AvisoDetalhe | null>(null);
  const [error, setError] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [readError, setReadError] = useState('');
  const [readAttempt, setReadAttempt] = useState(0);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    obterAviso(id, controller.signal).then(setItem).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      const status = reason instanceof ApiError ? reason.status : 500;
      if (status === 401) router.replace('/login'); else setError(status);
    });
    return () => controller.abort();
  }, [id, attempt, router]);
  useEffect(() => { if (item?.id) ref.current?.focus({ preventScroll: true }); }, [item?.id]);
  const version = item?.atualizado_em;
  const state = item?.situacao;
  const read = item?.lido;
  useEffect(() => {
    if (!version || state !== 'ativo' || read) return;
    const controller = new AbortController();
    marcarAvisoLido(id, version, controller.signal).then(result => {
      setItem(current => current?.id === id && current.atualizado_em === version ? { ...current, ...result } : current);
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return;
      if (reason instanceof ApiError && reason.status === 401) router.replace('/login');
      else setReadError(reason instanceof Error ? reason.message : 'Não foi possível registrar a leitura.');
    });
    return () => controller.abort();
  }, [id, version, state, read, readAttempt, router]);
  if (!item && !error) return <main id="conteudo" className="content detail-state" tabIndex={-1}><output><span className="spinner" /> Carregando aviso…</output></main>;
  if (error) return <main id="conteudo" className="content detail-state" tabIndex={-1} role="alert"><AlertTriangle size={38} /><h1>{error === 404 ? 'Aviso indisponível' : 'Não foi possível carregar'}</h1><p>{error === 404 ? 'O aviso não existe ou não pertence à sua equipe.' : 'Verifique a conexão com a API e tente novamente.'}</p>{error !== 404 && <button className="secondary" onClick={() => { setError(null); setAttempt(value => value + 1); }}><RotateCcw size={17} /> Tentar novamente</button>}<Link href="/avisos">Voltar aos avisos</Link></main>;
  if (!item) return null;
  return <main ref={ref} id="conteudo" className="content notice-detail" tabIndex={-1}><div className="notice-detail-toolbar"><Link className="back-link" href="/avisos"><ArrowLeft size={18} /> Voltar aos avisos</Link>{user.perfil === 'gestor' && <div><AvisoForm initial={item} onSaved={updated => { setItem(updated); setReadError(''); setSaved(true); }} /><CancelarAviso id={item.id} onCancelled={() => router.push('/avisos')} /></div>}</div>{saved && <output className="toast success">Aviso atualizado. A equipe verá esta versão como não lida.</output>}{readError && <div className="toast error" role="alert"><p>{readError}</p><button className="secondary" onClick={() => { setReadError(''); setItem(null); setAttempt(value => value + 1); setReadAttempt(value => value + 1); }}>Tentar novamente</button></div>}<article><div className="notice-badges"><span className={`notice-tag ${item.categoria}`}>{item.categoria === 'urgente' ? 'Urgente' : 'Informativo'}</span><output className="notice-reading-state">{item.situacao !== 'ativo' ? situacaoAvisoLabel[item.situacao] : item.lido ? 'Lido' : readError ? 'Leitura não registrada' : 'Registrando leitura…'}</output></div><h1>{item.titulo}</h1><p className="notice-byline">Publicado por {item.autor} em <time dateTime={item.publicado_em}>{data(item.publicado_em)}</time></p><p className="notice-audience">{item.destinatarios.length ? `Destinado a ${item.destinatarios.map(person => person.nome).join(', ')}` : 'Destinado a toda a equipe'}</p>{item.expira_em && <p className="notice-validity">Disponível até {data(item.expira_em)}</p>}<p className="notice-summary">{item.resumo}</p><div className="notice-body">{item.conteudo}</div></article></main>;
}
